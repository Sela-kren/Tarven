/**
 * Brawls: a guest who's had too much, or is spoiling for it, starts trouble, and whoever's on the floor deals with
 * it, turn by turn, Karryn-style. She can hit, shove, dodge, talk them down with Charm, stare them down with Mind,
 * and once they're worn out, throw them out.
 *
 * Grabs, headlocks, hair-pulls, tackles and the rest of their grapples (FOE_GRAPPLES: bear hugs, arm twists,
 * pins, sweeps, collar hauls) are fighting, on both sides: combat moves like a punch, not touches, so they never
 * ask her anything.
 *
 * A foe who came in worked up may stop swinging and reach for her instead. That isn't a fight move: the fight
 * stops on it (`reaching`) and the tavern asks her on the usual touch screen (Let it / Lean in / Slap / Pull away;
 * Pull away always works). Her answer comes back through `afterReach`.
 *
 * Her desire comes into the fight with her, Karryn-style (desire.ts): past 50 each desire gets in her way, twice as
 * much past 80 (horny); their grapples stir the part their type goes for; she can suppress it for willpower; and
 * her Cock desire opens up her hands, her mouth and riding them (wet), which wear them out instead of her fists.
 *
 * Win, and they're out the door and the room thinks the more of her. Lose, and they grab what they can from the
 * till. Anything offered after a loss is the tavern's to offer, and hers to turn down (GAME_PATH.MD, "Brawl loss").
 */
import { statsOf, type RoleStats } from "./guestroles";
import type { GuestKind } from "./tavern";
import type { StatId } from "./skills";
import { knowsMove, type BrawlSkillId } from "./brawlskills";
import { flavor } from "./flavor";
import { HIT_WILL, maxWillpower, STARE_WILL, STEEL_STAMINA, STEEL_WILL } from "./willpower";
import {
  desirePenalties,
  horny,
  HORNY_AT,
  INTIMATE_MOVES,
  METER_OF_AREA,
  suppressAmount,
  suppressCost,
  wet,
  type DesirePenalties,
  type IntimateMove,
} from "./desire";
import { METER_NAMES, METER_MAX, METERS, type Meter, type Meters } from "./passives";
import type { DuelArea } from "./duel";
import {
  BARE_LINES,
  CROWD_FIXED_LINES,
  CROWD_STRIPPED_LINES,
  FIX_CLOTHES_ENERGY,
  FIX_LINES,
  type FightClothes,
  GRAPPLE_TEAR,
  GRAPPLE_TEAR_LINES,
  HER_STRIPPED_LINES,
  MATE_STRIPPED_LINES,
  STRIP_CHANCE,
  STRIP_REACH_LINES,
  STRIP_VOICES,
  STRIPPED_LINES,
  withPiece,
} from "./brawlclothes";
import { ANGER, erect, FOE_PLEASURE, FOE_PLEASURE_MAX, LEWD_METER, lewdTurn, wantsHer, type LewdPart } from "./brawlai";
import { AFTER_COME_RATE, FOE_PREFIXES, type FoePrefixId } from "./foeprefix";
import { FOE_SCENES, joinSlots, kickCounterChance, pickFoeScene, startable, upgradeScene, type FoeSceneId, type HerReadiness } from "./brawlscenes";
import type { JoinSlot } from "./sexpose";
import {
  BREATHE,
  CAUTIOUS,
  CLIMAX_ENERGY,
  COUNTER_SHARE,
  DEFENSIVE,
  ENERGY_COST,
  FATIGUE_PER_LEVEL,
  REVITALIZE_STAMINA,
  SECOND_WIND_SHARE,
  STANCE_NAMES,
  STANCE_TURNS,
  type Stance,
} from "./herstate";
import {
  COME_LINES,
  CROWD_CHANCE,
  CROWD_LINES,
  CLIMAX_LINES,
  FOE_CHATTER,
  RECOVER_LINES,
  JOIN_LINES,
  JOINED_LINES,
  JOINED_POSE_LINES,
  MATE_CHANCE,
  type MateMoment,
  GO_ALONG_LINES,
  line,
  OFFER_LINES,
  POSE_LINES,
  SIGHT_LINES,
  STRUGGLE_LINES,
  TAKEN_LINES,
  type CrowdMoment,
  type Skill,
} from "./brawllines";
import { VOICES } from "./brawlvoices";
import {
  COCK_STACK,
  JERK_PLEASURE,
  JERK_TALK_LINES,
  LEWD_PARTS,
  NAKED_AT,
  NAKED_MEN_MAX,
  NAKED_PLEASURE,
  NO_EVIL_COST,
  NO_EVIL_ROUNDS,
  noEvilCut,
  perTalker,
  SIGHT_EVERY_PER,
  SIGHT_GUARD_MAX,
  SIGHT_RATE_PER,
  SIGHT_SENSE_PER,
  SIGHT_STACK,
  sightGain,
  speakNoEvilDown,
  STARER_LEVEL,
  REP_LINE_SHARE,
  REP_TALK_LINES,
  TALK_COME,
  TALK_GROPE,
  TALK_SIGHT,
  TALK_STACK,
  TALKER_LEVEL,
  talkGain,
  talkRep,
  type TalkStats,
} from "./lewdtalk";
import { experienceTier, HER_CLIMAX_LINES, HER_COME_LINES, HER_LINES, herVoice, SCENE_MOMENTS, type HerMoment, type HerVoice } from "./brawlher";
import type { FightTier } from "./fightface";

export type FightMove =
  | "strike"
  /** A kick: harder than a strike, but a bandit or adventurer may catch it (KP's kick counter, brawlscenes.ts). */
  | "kick"
  | "shove"
  | "grab"
  | "headlock"
  | "hairpull"
  | "tackle"
  | "dodge"
  | "talk"
  | "stare"
  | "steel"
  | "suppress"
  | "suppressCock"
  | IntimateMove
  | "throw"
  /** Held in a scene a foe started (GAME_PATH.MD 7i): wrench free, or go along with it. */
  | "struggle"
  | "goAlong"
  /**
   * Karryn's own lewd moves (KP's Flaunt, Open Pleasure and Give Up, and her starting a sex skill herself): show
   * herself off to the room, a stance where she gives in to it, give up and go down, or take the lead in a scene.
   */
  | "flaunt"
  /** Pull out whatever toys they've put in her (KP's toys). */
  | "pullToys"
  /** KP's Deny Ejaculation (a willpower skill, from her dom side): none of them finishes inside her. */
  | "deny"
  | "open"
  | "giveUp"
  | "lead"
  /** KP's willpower skills, used before her move (brawl 7j): one a turn, and they don't take her turn. */
  | "release"
  | "releaseCock"
  | "eye"
  | "edge"
  | "resist"
  /** KP's See, Hear and Speak No Evil (willpower skills her edicts teach her): shut out stares, talk, then the want itself. */
  | "seeNoEvil"
  | "hearNoEvil"
  | "speakNoEvil"
  /** Gathering herself takes her turn: willpower back. Coming to after she's come, likewise. */
  | "restore"
  | "recover"
  /** KP's energy skills (7k): Revitalize and Breathe take her turn; Second Wind, once she's down; stances don't. */
  | "revitalize"
  | "breathe"
  | "secondWind"
  | "stayDown"
  /** KP's Fix Clothes (7l): the last piece they had off her this brawl, back on. Takes her turn. */
  | "fixClothes"
  | Stance;
export type FightOutcome = "won" | "talked" | "lost";

/**
 * What a guest shouts at her as trouble boils up, before they come for her: an angry guest's spite, or a
 * roaring drunk's slurring. Said out loud over their head, and written in the log.
 */
export const TROUBLE_SHOUTS: Record<"angry" | "drunk", readonly string[]> = {
  angry: [
    "Oi! Innkeeper! I've waited long enough!",
    "You think you can ignore me? Think again.",
    "This place is a pigsty, and you're the one running it.",
    "Walk past me one more time. Go on. I dare you.",
    "Somebody's going to pay for this, and it's you.",
    "Think you own this pass? Let's see about that.",
    "I've had it with you. Come here!",
    "Sneer at me, will you? I'll wipe that look off.",
  ],
  drunk: [
    "Wha' are YOU lookin' at?",
    "Shtop the room spinning! ...It's you, innit? You're doin' it!",
    "I could take you. I could take ALL of you!",
    "Watered ale! You watered it! I'll show you watered!",
    "C'mere. C'mere! Nobody cuts me off!",
    "Another round! ...No? NO? Right!",
    "Wanna dance? No? Then we'll FIGHT!",
    "I'm not drunk! You're drunk! Come 'ere and say that!",
  ],
};

const BASE_STAMINA = 20;
/** Worn down to this share of their stamina, and they can be thrown out. */
const THROW_AT = 0.3;
/** How much her grip on their arm throws off their next swing, and theirs on her, her next move. */
const HOLD_ACCURACY = 0.3;
const HELD_CHANCE = 0.15;
/** A hair-pull leaves their eyes watering: this much off their aim, down to the floor below. */
const HAIRPULL_ACCURACY = 0.05;
const MIN_ACCURACY = 0.3;
/** Stamina a missed tackle costs her, hitting the floor. */
const TACKLE_MISS = 2;
/** Of their blows that land, how many are grapples instead of a fist. */
const FOE_GRAPPLE = 0.35;

/**
 * Their grapples, Karryn-style: a whole set of ways to get hold of her, each its own hurt. All of them fighting,
 * never a touch, so none of them asks her anything. Grab comes first: a roll of 0 is always a grab.
 */
export type FoeGrapple = "grab" | "headlock" | "hairpull" | "tackle" | "bearhug" | "armtwist" | "pin" | "sweep" | "collar";
interface GrappleDef {
  /** Added to their attack for the hurt. */
  damage: number;
  /** Willpower it knocks out of her, in blows' worth. */
  will: number;
  /** Leaves her caught: her next move is harder. */
  holds?: boolean;
  text: string;
}
export const FOE_GRAPPLES: Record<FoeGrapple, GrappleDef> = {
  grab: { damage: -2, will: 1, holds: true, text: "They grab your arm and wrench it round. You're caught." },
  headlock: { damage: 0, will: 2, text: "They get you in a headlock and squeeze." },
  hairpull: { damage: -1, will: 2, text: "They grab a fistful of your hair and yank." },
  tackle: { damage: 1, will: 1, text: "They barrel into you and you both go into a table." },
  bearhug: { damage: 0, will: 1, holds: true, text: "They get both arms round you from behind and crush the air out of you." },
  armtwist: { damage: -1, will: 1, holds: true, text: "They twist your arm up behind your back and march you into the bar." },
  pin: { damage: -1, will: 2, holds: true, text: "They slam you back against the wall and hold you there by the shoulders." },
  sweep: { damage: 0, will: 1, holds: true, text: "They hook your ankle and dump you on the floorboards." },
  collar: { damage: -1, will: 2, text: "They haul you up by the collar and shake you like a rag." },
};
/** Each kind's favourite grapples, three times as likely as the rest: a brute crushes, a smuggler trips. */
const GRAPPLE_FAVOURITES: Record<GuestKind, readonly FoeGrapple[]> = {
  farmer: ["bearhug", "tackle", "grab"],
  soldier: ["headlock", "armtwist", "pin"],
  smuggler: ["armtwist", "sweep", "hairpull"],
  fugitive: ["grab", "sweep", "hairpull"],
  adventurer: ["headlock", "tackle", "sweep"],
  bandit: ["bearhug", "pin", "collar", "hairpull"],
  noble: ["collar", "hairpull", "grab"],
};
const FAVOURITE_WEIGHT = 3;

/** Which grapple a foe of this kind goes for, from a roll of 0 to 1. */
export function pickGrapple(kind: GuestKind, roll: number): FoeGrapple {
  const all = Object.keys(FOE_GRAPPLES) as FoeGrapple[];
  const weights = all.map((g) => (GRAPPLE_FAVOURITES[kind]?.includes(g) ? FAVOURITE_WEIGHT : 1));
  let left = roll * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < all.length; i++) {
    left -= weights[i];
    if (left < 0) return all[i];
  }
  return all[all.length - 1];
}
/** A worked-up foe's chance, each turn, to reach for her instead of swinging; and how many times a fight. */
const REACH_IN_BRAWL = 0.2;
const MAX_REACHES = 2;
/** Desire a grapple of theirs stirs: in the part their type goes for, and a little all over. */
const GRAPPLE_DESIRE = 5;
const GRAPPLE_BODY = 2;
/**
 * At the top of her pleasure she comes, right there mid-brawl, Karryn-style (GAME_PATH.MD 7j): it leaves her
 * reeling for a turn, with less willpower and stamina, and her pleasure back to nothing.
 */
const FIGHT_PLEASURE_MAX = 100;
export const CLIMAX = { will: 5, stamina: 2 } as const;

/**
 * KP's willpower skills (its mental phase; GAME_PATH.MD 7j): each used before her move, one a turn, and none of them
 * takes her turn. Suppressing and releasing her desire; Eye of the Mind (her next blow can't miss, and hits harder);
 * Edging Control (for a few turns she won't come); Resist (her pleasure down). Dearer while she's horny.
 */
const MIND_MOVES: ReadonlySet<FightMove> = new Set<FightMove>([
  "suppress",
  "suppressCock",
  "release",
  "releaseCock",
  "eye",
  "edge",
  "resist",
  "deny",
  "seeNoEvil",
  "hearNoEvil",
  "speakNoEvil",
]);
export const MIND_COST = { release: 2, releaseCock: 3, eye: 5, edge: 5, resist: 6, deny: 4 } as const;

/**
 * KP's toys (RemtairyKarryn.js canGet…ToyInserted): a foe who carries one may put it in her, asked like a scene
 * (Consent off: it just goes in), once she's ready for it. While it's in, it works on her every turn of theirs. She
 * can pull them out (a turn). Its picture (a cut-in each) is still to be made: POSES_TODO.md.
 */
export type ToyId = "rotor" | "dildo" | "beads";
export const TOYS: Readonly<Record<ToyId, { name: string; meter: Meter; need: number; wet?: boolean; exposure: number; per: number; offer: readonly string[]; worn: readonly string[] }>> = {
  rotor: { name: "a buzzing charm", meter: "pussy", need: 50, exposure: 0.7, per: 3, offer: ["{Name} pulls a little buzzing charm from his pouch and presses it hard against your clit.", "{Name} holds the rotor in place and tells you to keep fighting while it works.", "{Name} straps the charm tight and steps back so the room can hear it hum."], worn: ["The rotor buzzes steady on your clit while you swing and the benches start laughing.", "Every hit you land makes the charm press harder and your knees threaten to buckle.", "The fight keeps going and the little buzz never stops between your legs."] },
  dildo: { name: "a carved toy", meter: "pussy", need: 70, wet: true, exposure: 0.7, per: 5, offer: ["{Name} pulls a smooth carved wooden toy from his belt and pushes it into your pussy.", "{Name} works the dildo deep and tells you to keep it in while you brawl.", "{Name} leaves the toy seated and grins as the room watches you try to fight."], worn: ["The wooden dildo stays buried in your pussy while you trade blows on the sawdust.", "Every step makes the toy shift and the watching room bets you'll drop first.", "The fight drags on and the carved wood keeps you wet and distracted."] },
  beads: { name: "a string of beads", meter: "butt", need: 70, exposure: 0.7, per: 4, offer: ["{Name} pulls a string of glass beads from his pocket and starts pushing them into your ass.", "{Name} works each bead in one by one and tells you to hold them while you fight.", "{Name} leaves the string seated and the end dangling so the room can see."], worn: ["The glass beads shift in your ass every time you move and the benches cheer.", "You try to swing and the string tugs, making your hole clench around them.", "The fight keeps going and the beads stay deep while the room watches you squirm."] },
};
/** Who carries toys (KP: the nerds and their like), and the chance on a lewd turn he tries one. */
const TOY_KINDS: ReadonlySet<GuestKind> = new Set<GuestKind>(["noble", "smuggler"]);
const TOY_CHANCE = 0.25;
/** What horny adds to holding herself back (edging, resisting). */
const HORNY_MIND = 3;
export const RELEASE_AMOUNT = 15;
export const RESIST_AMOUNT = 25;
export const EDGE = { turns: 3, cap: 95 } as const;
export const EYE_DAMAGE = 1.5;
/** Gathering herself: willpower back, more the cooler her head. */
export const RESTORE_WILL = 6;

/** Her side of the fight: her stat levels, and what her passives add. */
export interface FighterStats {
  /** The brawl skills she's learned (brawlskills.ts): moves no skill she has teaches aren't offered. Left out, she knows them all. */
  skills?: ReadonlySet<BrawlSkillId>;
  levels: Record<StatId, number>;
  damage: number;
  dodge: number;
  talk: number;
  stare: number;
  /** Her willpower going in, and at the top. Left out, she starts with all a Mind like hers gives. */
  will?: number;
  maxWill?: number;
  /** The foe came in worked up (strong lust): now and then they reach for her instead of swinging. */
  workedUp?: boolean;
  /**
   * Her desire going in (see desire.ts). Left out (his brawls), desire plays no part: no penalties, no suppressing,
   * nothing intimate.
   */
  desire?: Meters;
  /** How much faster each desire fills, from her passives. */
  sens?: Meters;
  /** How high each desire can go (passives.ts desireCap, KP's max desire); none is the top. */
  caps?: Meters;
  /** Her pleasure going in, 0 to 100. */
  pleasure?: number;
  /** The part of her the foe's type goes for. */
  prefers?: DuelArea;
  /**
   * From her passives: extra chance her grapples land; less hurt from theirs; the share of being held she shrugs
   * off; extra damage from a slap mid-brawl; how much likelier a foe reaches; how much less desire gets in her way.
   */
  grappleHit?: number;
  grappleGuard?: number;
  heldEase?: number;
  brawlSlap?: number;
  brawlReach?: number;
  fightDesire?: number;
  /** Extra stamina from her Level. */
  extraStamina?: number;
  /** How much of her clothes are off, 0 to 1: what a foe can stare at, and what scenes he can start. */
  exposure?: number;
  /** Whether a foe can start a scene with her at all: not while she's too drunk to say yes (the consent rule). */
  sexOk?: boolean;
  /** Each guest's prefix (foeprefix.ts, KP's enemy prefixes), by their id; left out, nobody has one. */
  prefixOf?: (guestId: number) => FoePrefixId | undefined;
  /** How tough the ones she fights are, as a share (the difficulty: Easy 0.8, Normal 1, Hard 1.25). */
  foeScale?: number;
  /** How much less each desire a scene needs of her (her trinkets, KP's accessories). */
  sceneEase?: Partial<Record<Meter, number>>;
  /** Whether she has KP's Deny Ejaculation (from her dom side). */
  denyOk?: boolean;
  /** Settings switches (KP's): false keeps rimjobs, or footjobs, out of her brawls. */
  rimjob?: boolean;
  footjob?: boolean;
  /** Her Slut Level's tier, for how she answers in the log (brawlher.ts). */
  tier?: FightTier;
  /** Her fame: what the room has heard about her, for what a foe says when he talks lewd at her (lewdtalk.ts). */
  fame?: number;
  /** What lewd talk does to her, from her passives (lewdtalk.ts, KP's talk sensitivity and talk passives). */
  lewdTalk?: TalkStats;
  /** How many times she's done each act before, for how she talks and goes about it in a scene (brawlher.ts). */
  experience?: Partial<Record<DuelArea, number>>;
  /** Who's watching, as the log names them ("The farmer at their table"): the room, egging him on. */
  crowd?: readonly string[];
  /** Their table, who may jump into the brawl, first to last (GAME_PATH.MD 7i: KP's bar brawl joins). */
  joiners?: readonly FoeSpec[];
  /** Her energy going in, and at the top (herstate.ts, 7k). Left out, she has none, and no energy skills. */
  energy?: number;
  maxEnergy?: number;
  /** Her fatigue level, 0 to 5 (herstate.ts): each takes something off what she can do. */
  fatigue?: number;
  /**
   * Her clothes (brawlclothes.ts, 7l): what she has on, in the order it comes off, and how much is off going in. Given,
   * her exposure goes by them as they come off through the fight (and `exposure` is left out); a foe may go for them.
   */
  clothes?: FightClothes;
  /**
   * Consent off: Karryn's Prison (GAME_PATH.MD consent rule). A foe going for her clothes tears them off, with no
   * question, and a grapple of theirs can too.
   */
  forceful?: boolean;
}

/** Someone who may be in the brawl: who they are, their own numbers, the part of her they go for, worked up or not. */
export interface FoeSpec {
  guestId: number;
  kind: GuestKind;
  drunk: boolean;
  rolled?: RoleStats;
  prefers?: DuelArea;
  horny?: boolean;
  /** KP's enemy prefix (foeprefix.ts): "a big rogue". */
  prefix?: FoePrefixId;
}

/** How a foe's out of it: knocked out, thrown out, talked down, stared down, or spent. */
export type FoeOut = "knocked" | "thrown" | "talked" | "stared" | "spent";

/** One of them in the brawl (GAME_PATH.MD 7i): their own numbers, their own mind (brawlai.ts), and if they're out. */
export interface Foe {
  guestId: number;
  kind: GuestKind;
  /** What the log calls them: their type, with a letter once there's two of a kind ("rogue B"), KP-style. */
  name: string;
  drunk: boolean;
  prefers?: DuelArea;
  max: number;
  stamina: number;
  attack: number;
  accuracy: number;
  /** Their pleasure, 0 to 100: erect past half, spent at the top. */
  pleasure: number;
  /** KP's prefix, if they have one (foeprefix.ts). */
  prefix?: FoePrefixId;
  /** How fast their pleasure rises, as a share; and how many more times they can come before they're spent (KP's ejaculation stock). */
  rate: number;
  stock: number;
  horny: boolean;
  angry: boolean;
  anger: number;
  staggered: boolean;
  shaken: boolean;
  reaches: number;
  out: FoeOut | null;
}

/** At most this many in a brawl at once, the one who started it included. */
export const MAX_FOES = 4;
/** Each turn, the chance the next of their table jumps in: more if they're drunk or worked up. */
export const JOIN_BRAWL = 0.3;
/** What each slot she's joined at is of her (her mouth, a hand). */
const SLOT_AREA: Readonly<Record<JoinSlot, DuelArea>> = { mouth: "mouth", left: "hands", right: "hands" };

/** A scene a foe has her in mid-brawl (GAME_PATH.MD 7i): the part of her he has, turns it's gone on, and who (a foes index). */
export interface TakenScene {
  area: DuelArea;
  /** Which scene it is (brawlscenes.ts): one of Tarven's own (the part), or one of KP's. */
  scene: FoeSceneId;
  turns: number;
  foe: number;
}

/** How she goes about it, by how she talks: clumsy her first times, eager once she loves it (brawllines.ts). */
const SKILL_OF_VOICE: Readonly<Record<HerVoice, Skill>> = { first: "awkward", proper: "awkward", easy: "steady", lewd: "eager", horny: "eager", broken: "awkward" };

/** What she does with a foe in a scene counts toward her records like her own moves (riding them, like the bed). */
const ACT_OF_AREA: Partial<Record<DuelArea, IntimateMove>> = { hands: "hands", mouth: "mouth", pussy: "ride", butt: "ride" };
/** Flaunt: what it does to each of them (more the more of her is bare), and the chance it makes one horny. */
const FLAUNT_PLEASURE = 8;
const FLAUNT_HORNY = 0.3;
/** Open Pleasure: how much faster her desire climbs. */
const OPEN_DESIRE = 1.5;
/** In a scene, after this many of his turns, he may move it on to a bolder one: his pleasure × this, against 100. */
const UPGRADE_AFTER = 2;
const UPGRADE_SHARE = 0.5;
/** How many times a fight a foe who wants her can grope her (each one asks on the touch screen). */
const MAX_REACHES_WANTING = 3;

/** Her moves that are rolled for, and their names in the log's roll tags. */
type RolledMove = "strike" | "kick" | "shove" | "grab" | "headlock" | "hairpull" | "tackle" | "talk" | "stare" | "struggle";
const ROLLED_NAMES: Readonly<Record<RolledMove, string>> = {
  strike: "Strike",
  kick: "Kick",
  shove: "Shove",
  grab: "Grab",
  headlock: "Headlock",
  hairpull: "Hair pull",
  tackle: "Tackle",
  talk: "Talk down",
  stare: "Stare down",
  struggle: "Struggle",
};

/** A foe's name for a roll tag: "The archer" → "Archer". */
function foeTag(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export interface FightChoice {
  move: FightMove;
  label: string;
  /** The chance it works, 0 to 1, shown on the button; null for moves that just happen. */
  chance: number | null;
  disabled: boolean;
}

export class Fight {
  readonly maxStamina: number;
  stamina: number;
  /** Everyone in the brawl with her, the one who started it first (GAME_PATH.MD 7i). */
  readonly foes: Foe[] = [];
  /** Who she's going for. */
  target = 0;
  /** Whose numbers the fight's moves use now: her target on her turn, each of them on theirs. */
  private actor = 0;
  private readonly joinQueue: FoeSpec[];
  private dodging = false;
  /** She has hold of their arm: their next swing is off, and a headlock is on. */
  private holding = false;
  /** They have hold of her: her next move is harder. */
  private held = false;
  /** They've stopped swinging and reached for her: the fight waits for her answer (`afterReach`); who reached. */
  reaching = false;
  private reacher = 0;
  /** What just happened, newest last. */
  readonly log: string[] = [];
  /** The event behind each log line (see say), for the comic panel. */
  readonly events: string[] = [];
  outcome: FightOutcome | null = null;
  /** Experience earned in the fight, for the tavern to hand out at the end. */
  readonly xp: Partial<Record<StatId, number>> = {};
  /** Dodges that worked, for the records. */
  dodges = 0;
  /** Her grapples that landed, theirs that landed on her, and times they had hold of her: for the records. */
  grapplesLanded = 0;
  grapplesTaken = 0;
  timesHeld = 0;
  /** Her willpower: staring down and steeling herself spend it, blows that land wear it down. */
  will: number;
  readonly maxWill: number;
  /** Her desire through the fight, or null when it plays no part. The tavern takes it back at the end. */
  readonly desire: Meters | null;
  pleasure: number;
  /** What she did with her hands and mouth, for the records. */
  readonly acts: Partial<Record<IntimateMove, number>> = {};
  /** Won by wearing them out with her hands, mouth or the rest, rather than her fists. */
  spent = false;
  /** A scene a foe has her in, or null; and the others joined in it, at her mouth or a hand (KP's pose joins). */
  taken: TakenScene | null = null;
  joined: { foe: number; slot: JoinSlot }[] = [];
  /** A foe wants to start a scene with her, or join her in one: the fight waits for her answer (`answerOffer`). */
  offering: DuelArea | null = null;
  /** The scene on offer (brawlscenes.ts), and whether it's moving the one she's in on to a bolder one. */
  offeringScene: FoeSceneId | null = null;
  offerUpgrade = false;
  private offerer = 0;
  private offerSlot: JoinSlot | null = null;
  /** KP's toys she has in, and one on offer; whether she's denying them inside her (KP's Deny Ejaculation). */
  readonly toys = new Set<ToyId>();
  offeringToy: ToyId | null = null;
  /** Toys she's let in this fight, for the records. */
  toysIn = 0;
  denying = false;
  /** Times one of them came, in all (a foe with more in him counts each time). */
  comes = 0;
  /** Times they stared at her bare, for the records. */
  sightings = 0;
  /**
   * Lewd talk this brawl (lewdtalk.ts), for the records: lines about each part, which of them talked, the pleasure it
   * gave her, times it made her come, and times one stroked himself at her.
   */
  readonly talkedAt: Partial<Record<LewdPart, number>> = {};
  readonly talkers = new Set<number>();
  /** Which of them have talked about each part this brawl: KP counts each new one, not each line. */
  private readonly talkersAbout: Partial<Record<LewdPart, Set<number>>> = {};
  /** Stares this brawl (lewdtalk.ts), for the records: by part, who stared (at all, and at each part), the pleasure, and times it made her come. */
  readonly seenAt: Partial<Record<LewdPart, number>> = {};
  readonly starers = new Set<number>();
  private readonly starersAbout: Partial<Record<LewdPart, Set<number>>> = {};
  sightPleasure = 0;
  sightClimaxes = 0;
  /** KP's See and Hear No Evil: the last of her turns they hold through. */
  private seeUntil = -1;
  private hearUntil = -1;
  talkPleasure = 0;
  talkClimaxes = 0;
  jerkedAt = 0;
  /** Lines of the log picked so far (picked apart from the fight's own dice), and whether the room's had its say this turn. */
  private texts = 0;
  private crowdSpoke = false;
  /** Whether the foes have had a word among themselves this turn. */
  private mateSpoke = false;
  /** Her chances as they stood when she made this turn's move, for the log's roll tags. */
  private rolled: Record<FightMove, number> | null = null;
  /**
   * Her energy (7k), the stance she's in and its turns left, whether she's changed stance this turn; down with no
   * stamina left (Second Wind, or stay down), and whether she's had her Second Wind; turns she's taken, for her fatigue.
   */
  energy: number;
  readonly maxEnergy: number;
  stance: Stance | null = null;
  private stanceTurns = 0;
  private stanceUsed = false;
  downed = false;
  private secondWindUsed = false;
  turns = 0;
  /** Her side, Karryn-style (7j): times she's come, reeling from it, a willpower skill used this turn, edging, Eye of the Mind. */
  climaxes = 0;
  dazed = false;
  private mindUsed = false;
  private edgeTurns = 0;
  private eyeOpen = false;
  /**
   * Her clothes (7l): how many pieces are off her now, how many of those came off this brawl (Fix Clothes puts those
   * back), and what the foe reaching now is after: her, or her clothes.
   */
  clothesOff: number;
  private torn = 0;
  reachingFor: "touch" | "clothes" = "touch";
  private clothesAtReach = 0;

  constructor(
    guestId: number,
    kind: GuestKind,
    drunk: boolean,
    private readonly stats: FighterStats,
    private readonly random: () => number,
    /** Their own numbers, rolled from their type: a brute hits harder than a mage, and lasts longer. */
    rolled?: RoleStats,
  ) {
    this.foes.push(this.makeFoe({ guestId, kind, drunk, rolled, prefers: stats.prefers, horny: stats.workedUp }));
    this.joinQueue = [...(stats.joiners ?? [])];
    const name = this.name;
    this.maxStamina = this.stamina = BASE_STAMINA + (stats.levels.endurance - 1) * 4 + (stats.extraStamina ?? 0);
    this.maxWill = stats.maxWill ?? maxWillpower(stats.levels.mind);
    this.will = Math.max(0, Math.min(this.maxWill, stats.will ?? this.maxWill));
    this.desire = stats.desire ? { ...stats.desire } : null;
    this.pleasure = stats.pleasure ?? 0;
    this.maxEnergy = Math.max(0, stats.maxEnergy ?? 0);
    this.energy = Math.max(0, Math.min(this.maxEnergy, stats.energy ?? this.maxEnergy));
    this.clothesOff = Math.min(stats.clothes?.pieces.length ?? 0, stats.clothes?.off ?? 0);
    this.say("start", drunk ? `The ${name} is roaring drunk and wants a fight.` : `The ${name} squares up to you.`);
  }

  /** Someone in the brawl, from who they are: their type's numbers (or their own, rolled), and a name of their own. */
  private makeFoe(spec: FoeSpec): Foe {
    const who = spec.rolled ?? statsOf(spec.kind);
    const prefix = spec.prefix ?? this.stats.prefixOf?.(spec.guestId);
    const pre = prefix ? FOE_PREFIXES[prefix] : undefined;
    const base = `${pre ? `${pre.word} ` : ""}${who.label.toLowerCase()}`;
    const same = this.foes.filter((f) => f.name === base || f.name.startsWith(`${base} `)).length;
    const horny = Boolean(spec.horny) || Boolean(pre?.horny);
    // The difficulty, and their prefix: tougher or softer, harder hitting or not (KP's enemy prefixes).
    const scale = this.stats.foeScale ?? 1;
    const stamina = Math.max(4, Math.round(who.fight.stamina * scale * (1 + (pre?.stamina ?? 0))));
    return {
      guestId: spec.guestId,
      kind: spec.kind,
      name: same === 0 ? base : `${base} ${"BCDEFG"[same - 1]}`,
      drunk: spec.drunk,
      prefers: spec.prefers,
      max: stamina,
      stamina,
      attack: Math.max(1, Math.round(who.fight.attack * scale) + (pre?.attack ?? 0) + (spec.drunk ? 1 : 0)),
      accuracy: who.fight.accuracy + (pre?.accuracy ?? 0) - (spec.drunk ? 0.15 : 0),
      pleasure: 0,
      prefix,
      rate: pre?.rate ?? 1,
      stock: 1 + (pre?.stock ?? 0),
      horny,
      angry: !spec.drunk && !horny,
      anger: horny ? 30 : spec.drunk ? ANGER.drunk : ANGER.angry,
      staggered: false,
      shaken: false,
      reaches: 0,
      out: null,
    };
  }

  /** The one whose turn it is, or she's going for on hers. */
  private get foe(): Foe {
    return this.foes[this.actor];
  }
  /** The one who started it. */
  get lead(): Foe {
    return this.foes[0];
  }
  /** Who's still in it. */
  get standing(): Foe[] {
    return this.foes.filter((f) => !f.out);
  }
  /** The one she's going for. */
  get targeted(): Foe {
    return this.foes[this.target];
  }
  /** Who reached for her, while the touch screen asks her (`reaching`). */
  get reachingGuestId(): number {
    return this.foes[this.reacher].guestId;
  }
  get guestId(): number {
    return this.foe.guestId;
  }
  get kind(): GuestKind {
    return this.foe.kind;
  }
  get name(): string {
    return this.foe.name;
  }
  get drunk(): boolean {
    return this.foe.drunk;
  }
  get foeMax(): number {
    return this.foe.max;
  }
  get foeStamina(): number {
    return this.foe.stamina;
  }
  set foeStamina(n: number) {
    this.foe.stamina = n;
  }
  get foePleasure(): number {
    return this.foe.pleasure;
  }
  set foePleasure(n: number) {
    this.foe.pleasure = n;
  }
  get foeHorny(): boolean {
    return this.foe.horny;
  }
  get foeAngry(): boolean {
    return this.foe.angry;
  }
  private get foeAnger(): number {
    return this.foe.anger;
  }
  private get foeAttack(): number {
    return this.foe.attack;
  }
  private set foeAttack(n: number) {
    this.foe.attack = n;
  }
  private get foeAccuracy(): number {
    return this.foe.accuracy;
  }
  private set foeAccuracy(n: number) {
    this.foe.accuracy = n;
  }
  private get staggered(): boolean {
    return this.foe.staggered;
  }
  private set staggered(b: boolean) {
    this.foe.staggered = b;
  }
  private get shaken(): boolean {
    return this.foe.shaken;
  }
  private set shaken(b: boolean) {
    this.foe.shaken = b;
  }
  private get reaches(): number {
    return this.foe.reaches;
  }
  private set reaches(n: number) {
    this.foe.reaches = n;
  }

  /** She turns on another of them: her grip on the last one's arm goes. */
  setTarget(index: number): void {
    if (!this.foes[index] || this.foes[index].out || index === this.target) return;
    this.target = index;
    this.actor = index;
    this.holding = false;
  }

  /** What happened, then, if the AI has written one, a line of colour for it. */
  /** A line from outside the fight's own moves (an invasion's door), into the log. */
  narrate(event: string, text: string): void {
    this.say(event, text);
  }

  /** Everyone still waiting to pile in comes in now (an invasion: they come through the door together). */
  allIn(): void {
    while (this.joinQueue.length > 0 && this.standing.length < MAX_FOES) this.foes.push(this.makeFoe(this.joinQueue.shift()!));
  }

  /**
   * A line for a move that was rolled for: a tag first with who did it, what it was, the chance it had and whether
   * it came off ("[You · Strike · 73% · HIT] ..."), so the log shows every roll, hers and theirs. fightpanels.ts
   * draws the tag as a badge.
   */
  private rollTag(who: string, what: string, chance: number, ok: boolean, words: readonly [string, string] = ["HIT", "MISS"]): string {
    const pct = Math.round(Math.min(1, Math.max(0, chance)) * 100);
    return `[${who} · ${what} · ${pct}% · ${ok ? words[0] : words[1]}] `;
  }

  /** Her rolled move's line, tagged with the chance it had when she picked it (`rolled`) and how it went. */
  private sayRolled(move: RolledMove, result: string, text: string): void {
    const ok = result === "hit" || result === "ok" || result === "win" || result === "free";
    const words = move === "talk" || move === "stare" || move === "struggle" ? (["SUCCESS", "FAIL"] as const) : undefined;
    this.say(`${move}:${result}`, this.rollTag("You", ROLLED_NAMES[move], this.rolled?.[move] ?? 0, ok, words) + text);
  }

  private say(event: string, text: string): void {
    this.log.push(text);
    this.events.push(event);
    const extra = flavor(`fight:${event}`, this.kind);
    if (extra) this.log.push(extra);
  }

  private gain(stat: StatId, n: number): void {
    this.xp[stat] = (this.xp[stat] ?? 0) + n;
  }

  /** What her desire costs her right now; nothing when desire plays no part. */
  get penalties(): DesirePenalties {
    if (!this.desire) return { accuracy: 0, dodge: 0, voice: 0, damage: 0, grapple: 0, reach: 0 };
    // Passives (Scrapper's Blush) take some of the sting out of wanting it.
    const keep = Math.max(0, 1 - (this.stats.fightDesire ?? 0));
    const p = desirePenalties(this.desire);
    return {
      accuracy: p.accuracy * keep,
      dodge: p.dodge * keep,
      voice: p.voice * keep,
      damage: Math.round(p.damage * keep),
      grapple: p.grapple * keep,
      reach: p.reach * keep,
    };
  }

  /** Any desire at 80 or more. */
  get horny(): boolean {
    return this.desire ? horny(this.desire) : false;
  }

  /** Wet enough to ride them. */
  get wet(): boolean {
    return this.desire ? wet(this.desire.pussy, this.pleasure) : false;
  }

  /** The tavern's view of her desire and pleasure, after the touch screen has had its say mid-fight. */
  setDesire(desire: Readonly<Meters>, pleasure: number): void {
    if (!this.desire) return;
    Object.assign(this.desire, desire);
    this.pleasure = pleasure;
  }

  private chances(): Record<FightMove, number> {
    const { levels, talk, stare } = this.stats;
    const agi = (levels.agility - 1) * 0.03;
    const str = (levels.strength - 1) * 0.04;
    const end = (levels.endurance - 1) * 0.02;
    // In their grip, everything but a dodge is harder; and wanting it throws her aim off (Mouth desire).
    const p = this.penalties;
    // Hold Breaker shrugs off part of being held; Wrestler makes her grapples likelier.
    // Fatigue (7k) takes the edge off everything she does.
    const tired = this.tired * 0.3;
    const off = (this.held ? HELD_CHANCE * Math.max(0, 1 - (this.stats.heldEase ?? 0)) : 0) + p.accuracy + tired;
    const grip = this.stats.grappleHit ?? 0;
    // Eye of the Mind: she sees exactly where they'll be.
    const sure = (n: number) => (this.eyeOpen ? 1 : n);
    return {
      strike: sure(Math.min(0.95, 0.7 + agi) - off),
      kick: sure(Math.min(0.9, 0.62 + agi) - off),
      shove: sure(Math.min(0.95, 0.8 + agi) - off),
      grab: sure(Math.min(0.95, 0.75 + agi + grip) - off),
      headlock: sure(Math.min(0.95, 0.65 + str + grip) - off),
      hairpull: sure(Math.min(0.95, 0.85 + agi + grip) - off),
      tackle: sure(Math.min(0.9, 0.55 + str + end + grip) - off),
      dodge: 1,
      // With no willpower left she's rattled, and it shows in her voice; so does wanting it (Pussy desire).
      talk: clamp01(
        0.15 + (levels.charm - 1) * 0.07 + talk - (this.drunk ? 0.1 : 0) - (this.kind === "soldier" ? 0.1 : 0) - (this.will <= 0 ? 0.1 : 0) - p.voice - tired - this.talkMind,
      ),
      stare: clamp01(0.1 + (levels.mind - 1) * 0.06 + stare - p.voice - tired - this.talkMind),
      steel: 1,
      release: 1,
      releaseCock: 1,
      seeNoEvil: 1,
      hearNoEvil: 1,
      speakNoEvil: 1,
      eye: 1,
      edge: 1,
      resist: 1,
      restore: 1,
      recover: 1,
      revitalize: 1,
      breathe: 1,
      secondWind: 1,
      stayDown: 1,
      fixClothes: 1,
      cautious: 1,
      defensive: 1,
      counter: 1,
      // Wrenching free of a foe who has her: her strength and quickness, less how much she wants it.
      struggle: clamp01(0.35 + (levels.strength - 1) * 0.05 + (levels.agility - 1) * 0.02 - (this.horny ? 0.1 : 0) - tired),
      goAlong: 1,
      suppress: 1,
      suppressCock: 1,
      hands: 1,
      mouth: 1,
      ride: 1,
      throw: 1,
      flaunt: 1,
      pullToys: 1,
      deny: 1,
      open: 1,
      giveUp: 1,
      lead: 1,
    };
  }

  /** Damage behind her blows: Body desire takes some of the weight out of them; Eye of the Mind puts it back, and more. */
  private blow(base: number): number {
    // Fatigue takes a share off the weight behind them (KP: 10% off a level).
    const damage = Math.max(1, Math.round((base - this.penalties.damage) * (1 - this.tired)));
    return this.eyeOpen ? Math.round(damage * EYE_DAMAGE) : damage;
  }

  /** How high a desire can go in this fight (KP's max desire). */
  private capOf(meter: Meter): number {
    return this.stats.caps?.[meter] ?? METER_MAX;
  }

  /** Raises a desire mid-fight, faster with passives that make it so. */
  private stir(meter: Meter, n: number): number {
    if (!this.desire || n <= 0) return 0;
    const before = this.desire[meter];
    // Open Pleasure: she lets it in, and it climbs faster.
    const open = this.stance === "open" ? OPEN_DESIRE : 1;
    this.desire[meter] = Math.min(this.capOf(meter), before + n * open * (1 + (this.stats.sens?.[meter] ?? 0)));
    return Math.round(this.desire[meter] - before);
  }

  /**
   * The intimate moves she has: each only shows once her Cock desire (and wetness) open it. Until then it isn't in
   * the list at all, not greyed out: a move she hasn't unlocked yet stays hidden.
   */
  private intimateChoices(): FightChoice[] {
    const desire = this.desire;
    if (!desire) return [];
    // Karryn's own (KP): showing off, taking the lead in a scene she's done before, and giving up.
    const lead = this.leadScene();
    const own: FightChoice[] = [
      { move: "flaunt", label: "Flaunt yourself · works them all up, and you", chance: null, disabled: false },
      ...(lead ? [{ move: "lead" as const, label: `Take the lead (18+) · ${FOE_SCENES[lead].label}`, chance: null, disabled: false }] : []),
      { move: "giveUp", label: "Give up · let your legs go", chance: null, disabled: false },
      ...(this.toys.size > 0 ? [{ move: "pullToys" as const, label: "Pull the toys out", chance: null, disabled: false }] : []),
    ];
    return [...own, ...(Object.keys(INTIMATE_MOVES) as IntimateMove[])
      .filter((move) => desire.cock >= INTIMATE_MOVES[move].cock && (INTIMATE_MOVES[move].wet !== true || this.wet))
      .map((move) => {
        const def = INTIMATE_MOVES[move];
        return { move, label: `${def.label} · -${def.drain} their stamina`, chance: null, disabled: false };
      })];
  }

  /**
   * The scene she'd start with the one she's going for herself (KP: Karryn's sex skills, once a passive unlocks
   * them): the boldest of his she's ready for and has done before, if he's erect; or null.
   */
  private leadScene(): FoeSceneId | null {
    if (!this.desire || !this.stats.sexOk || this.drunk || this.taken) return null;
    const foe = this.targeted;
    if (!erect(foe)) return null;
    const her = this.herState();
    const done = (id: FoeSceneId) => (her.experience?.[FOE_SCENES[id].area] ?? 0) > 0;
    const mine = startable(foe.kind, foe.prefers, her).filter(done);
    if (mine.length === 0) return null;
    return mine.reduce((a, b) => (FOE_SCENES[b].boldness > FOE_SCENES[a].boldness ? b : a));
  }

  /** KP's willpower skills she has now (7j): one a turn, before her move; greyed once used, or short of willpower. */
  private mindChoices(inScene: boolean): FightChoice[] {
    const desire = this.desire;
    if (!desire) return [];
    const free = (move: FightMove, label: string, cost: number, shown = true): FightChoice[] =>
      shown ? [{ move, label: `${label} (Mind · no turn) · ${cost} will`, chance: null, disabled: this.mindUsed || this.will < cost }] : [];
    const others = METERS.some((m) => m !== "cock" && desire[m] > 0);
    return [
      ...free("suppress", "Suppress desire", this.mindCost("suppress")!, others),
      ...free("suppressCock", "Suppress Cock desire", this.mindCost("suppressCock")!, desire.cock > 0),
      ...free("release", "Release desire", this.mindCost("release")!),
      ...free("releaseCock", "Release Cock desire", this.mindCost("releaseCock")!),
      ...free("eye", "Eye of the Mind", this.mindCost("eye")!, !inScene),
      ...free("edge", "Edging Control", this.mindCost("edge")!, this.pleasure >= 50 && this.edgeTurns === 0),
      ...free("resist", "Resist", this.mindCost("resist")!, this.pleasure >= 30),
      ...free("deny", "Deny them inside you", this.mindCost("deny")!, Boolean(this.stats.denyOk) && !this.denying),
      // KP's See, Hear and Speak No Evil, once her edicts teach them; not with one of them in her (KP: not in a sex pose).
      ...free("seeNoEvil", "See No Evil", NO_EVIL_COST.seeNoEvil, Boolean(this.stats.lewdTalk?.seeNoEvil) && !inScene && !this.seeing),
      ...free("hearNoEvil", "Hear No Evil", NO_EVIL_COST.hearNoEvil, Boolean(this.stats.lewdTalk?.hearNoEvil) && !inScene && !this.hearing),
      ...free("speakNoEvil", "Speak No Evil", NO_EVIL_COST.speakNoEvil, Boolean(this.stats.lewdTalk?.speakNoEvil) && !inScene && this.seeing && this.hearing),
    ];
  }

  /** What a willpower skill costs her now: holding herself back is dearer while she's horny. */
  private mindCost(move: FightMove): number | null {
    const horny = this.horny;
    switch (move) {
      case "suppress":
        return suppressCost(false, horny);
      case "suppressCock":
        return suppressCost(true, horny);
      case "release":
      case "releaseCock":
      case "eye":
      case "deny":
        return MIND_COST[move];
      case "edge":
      case "resist":
        return MIND_COST[move] + (horny ? HORNY_MIND : 0);
      case "seeNoEvil":
      case "hearNoEvil":
      case "speakNoEvil":
        return NO_EVIL_COST[move];
      default:
        return null;
    }
  }

  /** Gathering herself, a turn spent getting her head back: willpower, more the cooler her head. */
  private restoreWill(): number {
    return RESTORE_WILL + (this.stats.levels.mind - 1) * 2;
  }

  /** What she can do now, with the chance each has: only the moves she's learned (brawlskills.ts). */
  choices(): FightChoice[] {
    const known = this.stats.skills;
    const all = this.everyChoice();
    return known ? all.filter((c) => knowsMove(c.move, known)) : all;
  }

  /** Every move open to her now, learned or not. */
  private everyChoice(): FightChoice[] {
    if (this.offering) return [];
    // Reeling from coming: nothing to do but come back to herself (KP's down, orgasm).
    if (this.dazed) return [{ move: "recover", label: "Come back to yourself", chance: null, disabled: false }];
    // Down with nothing left (KP's down, stamina): her Second Wind, if she has the energy, or stay down.
    if (this.downed)
      return [
        { move: "secondWind", label: `Second Wind (Energy) · back up with half your stamina · ${ENERGY_COST.secondWind} energy`, chance: null, disabled: false },
        { move: "stayDown", label: "Stay down", chance: null, disabled: false },
      ];
    if (this.taken) return this.takenChoices();
    const c = this.chances();
    const canThrow = this.foeStamina <= this.foeMax * THROW_AT;
    return [
      { move: "strike", label: "Strike", chance: c.strike, disabled: false },
      { move: "kick", label: "Kick", chance: c.kick, disabled: false },
      { move: "shove", label: "Shove", chance: c.shove, disabled: false },
      // One button: grab their arm, then, with hold of them, it's a headlock.
      this.holding
        ? { move: "headlock", label: "Headlock", chance: c.headlock, disabled: false }
        : { move: "grab", label: "Grab their arm", chance: c.grab, disabled: false },
      { move: "hairpull", label: "Pull their hair", chance: c.hairpull, disabled: false },
      { move: "tackle", label: "Tackle", chance: c.tackle, disabled: false },
      { move: "dodge", label: "Dodge", chance: null, disabled: false },
      { move: "talk", label: "Talk them down (Charm)", chance: c.talk, disabled: false },
      {
        move: "stare",
        label: `Stare them down (Mind) · ${STARE_WILL} will`,
        chance: c.stare,
        disabled: this.shaken || this.will < STARE_WILL,
      },
      {
        move: "steel",
        label: `Steel yourself · +${this.steelStamina()} stamina · ${STEEL_WILL} will`,
        chance: null,
        disabled: this.will < STEEL_WILL || this.stamina >= this.maxStamina,
      },
      {
        move: "restore",
        label: `Gather yourself (Mind) · +${this.restoreWill()} will`,
        chance: null,
        disabled: this.will >= this.maxWill,
      },
      ...this.mindChoices(false),
      ...this.energyChoices(false),
      ...this.intimateChoices(),
      { move: "throw", label: canThrow ? "Throw them out" : "Throw them out (wear them down first)", chance: null, disabled: !canThrow },
    ];
  }

  /** Held in a scene: her fists are no use. She can wrench free (strength), go along with it, or use her willpower. */
  private takenChoices(): FightChoice[] {
    const c = this.chances();
    return [
      { move: "struggle", label: "Struggle free (Strength)", chance: c.struggle, disabled: false },
      { move: "goAlong", label: "Go along with it", chance: null, disabled: false },
      {
        move: "steel",
        label: `Steel yourself · +${this.steelStamina()} stamina · ${STEEL_WILL} will`,
        chance: null,
        disabled: this.will < STEEL_WILL || this.stamina >= this.maxStamina,
      },
      ...this.mindChoices(true),
      ...this.energyChoices(true),
    ];
  }

  /** What fatigue takes off what she can do, 0 to 0.5 (herstate.ts: 10% a level). */
  private get tired(): number {
    return Math.min(0.5, (this.stats.fatigue ?? 0) * FATIGUE_PER_LEVEL);
  }

  /** What Revitalize gives back: more with Endurance. */
  private revitalizeStamina(): number {
    return REVITALIZE_STAMINA + (this.stats.levels.endurance - 1);
  }

  /**
   * Her energy skills (7k, KP's): Revitalize (stamina back) and Breathe (a little energy) take her turn; a stance
   * doesn't, one change a turn, and holds a few turns. None of them with no energy to her name.
   */
  private energyChoices(inScene: boolean): FightChoice[] {
    if (this.maxEnergy <= 0) return [];
    const stances: FightChoice[] = inScene
      ? []
      : (["cautious", "defensive", "counter", "open"] as const).map((stance) => ({
          move: stance,
          label: `${STANCE_NAMES[stance]} (Energy · no turn) · ${ENERGY_COST[stance]} energy`,
          chance: null,
          disabled: this.stanceUsed || this.stance === stance || this.energy < ENERGY_COST[stance],
        }));
    return [
      {
        move: "revitalize",
        label: `Revitalize (Energy) · +${this.revitalizeStamina()} stamina · ${ENERGY_COST.revitalize} energy`,
        chance: null,
        disabled: this.energy < ENERGY_COST.revitalize || this.stamina >= this.maxStamina,
      },
      { move: "breathe", label: `Breathe · +${BREATHE.energy} energy`, chance: null, disabled: this.energy >= this.maxEnergy },
      ...(this.stats.clothes && !inScene
        ? [
            {
              move: "fixClothes" as const,
              label: this.torn > 0 ? `Fix Clothes (Energy) · your ${this.lastTorn} back on · ${FIX_CLOTHES_ENERGY} energy` : "Fix Clothes (nothing of yours on the floor)",
              chance: null,
              disabled: this.torn <= 0 || this.energy < FIX_CLOTHES_ENERGY,
            },
          ]
        : []),
      ...stances,
    ];
  }

  /** The moves she can make while she's held in a scene. */
  private static readonly TAKEN_MOVES: ReadonlySet<FightMove> = new Set<FightMove>([
    "struggle",
    "goAlong",
    "steel",
    "suppress",
    "suppressCock",
    "release",
    "releaseCock",
    "edge",
    "resist",
    "recover",
    "revitalize",
    "breathe",
    "secondWind",
    "stayDown",
  ]);

  /** She makes her move; then, if it isn't over, they make theirs. */
  act(move: FightMove): void {
    if (this.outcome || this.reaching || this.offering) return;
    if (this.dazed !== (move === "recover")) return;
    if (this.downed !== (move === "secondWind" || move === "stayDown")) return;
    if (this.taken ? !Fight.TAKEN_MOVES.has(move) : move === "struggle" || move === "goAlong") return;
    this.actor = this.target;
    // Her willpower skills come before her move, and don't take her turn (KP's mental phase).
    if (MIND_MOVES.has(move)) {
      this.mind(move);
      return;
    }
    if (move === "cautious" || move === "defensive" || move === "counter" || move === "open") {
      this.takeStance(move);
      return;
    }
    this.turns++;
    this.crowdSpoke = false;
    this.mateSpoke = false;
    if (move === "headlock" && !this.holding) return;
    const c = this.chances();
    this.rolled = c;
    const roll = this.random();
    const { levels } = this.stats;
    // Whatever she does, she twists out of their grip doing it; and lets go of them unless she's locking it.
    this.held = false;
    if (move !== "headlock") this.holding = false;
    switch (move) {
      case "strike": {
        if (roll < c.strike) {
          const damage = this.blow(3 + (levels.strength - 1) + this.damageBonus);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.sayRolled("strike", "hit", `You land a solid blow. (-${damage})`);
          this.crowdSays("hit");
          this.mateSays("hit");
          this.gain("strength", 2);
        } else this.sayRolled("strike", "miss", "You swing and miss.");
        break;
      }
      case "kick": {
        // A bandit or adventurer, erect, may catch it and turn it into a scene (KP's kick counter), if she's ready.
        if (this.tryKickCounter()) break;
        if (roll < c.kick) {
          const damage = this.blow(4 + (levels.strength - 1) + this.damageBonus);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.sayRolled("kick", "hit", `Your boot lands square. (-${damage})`);
          this.crowdSays("hit");
          this.mateSays("hit");
          this.gain("strength", 2);
          this.gain("agility", 1);
        } else this.sayRolled("kick", "miss", "Your kick catches nothing but air.");
        break;
      }
      case "shove": {
        if (roll < c.shove) {
          const damage = 1 + Math.floor((levels.strength - 1) / 2);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.staggered = this.random() < 0.5 + (levels.strength - 1) * 0.05;
          this.sayRolled("shove", "hit", this.staggered ? `You shove them into a table. They stagger. (-${damage})` : `You shove them back. (-${damage})`);
          this.gain("strength", 1);
        } else this.sayRolled("shove", "miss", "They stand their ground.");
        break;
      }
      case "grab": {
        if (roll < c.grab) {
          this.foeStamina = Math.max(0, this.foeStamina - 1);
          this.holding = true;
          this.grapplesLanded++;
          this.sayRolled("grab", "hit", "You catch their wrist and twist it up behind them. (-1)");
          this.gain("strength", 1);
          this.gain("agility", 1);
        } else this.sayRolled("grab", "miss", "You grab for their arm and get a fistful of air.");
        break;
      }
      case "headlock": {
        this.holding = false;
        if (roll < c.headlock) {
          const damage = this.blow(3 + (levels.strength - 1) + this.damageBonus);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.staggered = true;
          this.grapplesLanded++;
          this.sayRolled("headlock", "hit", `You get an arm round their neck and squeeze till they sag. (-${damage})`);
          this.gain("strength", 3);
        } else this.sayRolled("headlock", "miss", "They wrench free before you can lock it.");
        break;
      }
      case "hairpull": {
        if (roll < c.hairpull) {
          this.foeStamina = Math.max(0, this.foeStamina - 2);
          this.foeAccuracy = Math.max(MIN_ACCURACY, this.foeAccuracy - HAIRPULL_ACCURACY);
          this.grapplesLanded++;
          this.sayRolled("hairpull", "hit", "You grab a fistful of hair and yank. Their eyes water. (-2)");
          this.gain("agility", 1);
        } else this.sayRolled("hairpull", "miss", "They jerk their head out of reach.");
        break;
      }
      case "tackle": {
        if (roll < c.tackle) {
          const damage = this.blow(4 + (levels.strength - 1) + this.damageBonus);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.staggered = true;
          this.grapplesLanded++;
          this.sayRolled("tackle", "hit", `You drive a shoulder into their middle and take them down over a bench. (-${damage})`);
          this.crowdSays("hit");
          this.gain("strength", 2);
          this.gain("endurance", 1);
        } else {
          const lost = Math.max(0, Math.min(this.stamina - 1, TACKLE_MISS));
          this.stamina -= lost;
          this.sayRolled("tackle", "miss", `They sidestep, and you hit the floor. (-${lost})`);
        }
        break;
      }
      case "dodge":
        this.dodging = true;
        this.say("dodge", "You get light on your feet.");
        break;
      case "talk":
        this.gain("charm", 2);
        if (roll < c.talk) {
          this.sayRolled("talk", "ok", "You talk them round. They sit back down, sheepish.");
          this.gain("charm", 5);
          this.foeOut("talked");
          break;
        }
        this.foeAttack++;
        this.sayRolled("talk", "fail", "They don't want to hear it. That made it worse.");
        break;
      case "stare":
        if (this.will < STARE_WILL) return;
        this.will -= STARE_WILL;
        this.gain("mind", 2);
        if (roll < c.stare) {
          this.shaken = true;
          this.foeAttack = Math.max(1, this.foeAttack - 2);
          this.foeAccuracy -= 0.1;
          this.gain("mind", 4);
          if (this.foeStamina <= this.foeMax / 2) {
            this.sayRolled("stare", "win", "You stare them down. They back away and leave.");
            this.foeOut("stared");
            break;
          }
          this.sayRolled("stare", "ok", "You stare them down. Their nerve falters.");
        } else this.sayRolled("stare", "fail", "They meet your stare and laugh.");
        break;
      case "steel": {
        if (this.will < STEEL_WILL) return;
        this.will -= STEEL_WILL;
        const back = Math.min(this.maxStamina - this.stamina, this.steelStamina());
        this.stamina += back;
        this.gain("mind", 2);
        this.say("steel", `You set your jaw and get your breath back. (+${back} stamina)`);
        break;
      }
      case "restore": {
        const back = Math.min(this.maxWill - this.will, this.restoreWill());
        if (back <= 0) return;
        this.will += back;
        this.gain("mind", 2);
        this.say("restore", `You close your eyes for a breath and gather yourself. (+${back} will)`);
        break;
      }
      case "revitalize": {
        if (this.energy < ENERGY_COST.revitalize) return;
        this.energy -= ENERGY_COST.revitalize;
        const back = Math.min(this.maxStamina - this.stamina, this.revitalizeStamina());
        this.stamina += back;
        this.gain("endurance", 2);
        this.say("revitalize", `You shake it off and find your strength again. (+${back} stamina)`);
        break;
      }
      case "breathe": {
        const back = Math.min(this.maxEnergy - this.energy, BREATHE.energy);
        this.energy += back;
        this.stamina = Math.min(this.maxStamina, this.stamina + BREATHE.stamina);
        this.say("breathe", `You breathe deep, in and out. (+${back} energy)`);
        break;
      }
      case "fixClothes": {
        if (this.torn <= 0 || this.energy < FIX_CLOTHES_ENERGY) return;
        const piece = this.lastTorn;
        this.energy -= FIX_CLOTHES_ENERGY;
        this.torn--;
        this.clothesOff--;
        this.gain("agility", 1);
        this.say("fixClothes", withPiece(line(FIX_LINES, this.textRoll(), this.name), piece));
        this.crowdSaysFrom(CROWD_FIXED_LINES);
        break;
      }
      case "secondWind":
        this.energy -= ENERGY_COST.secondWind;
        this.secondWindUsed = true;
        this.downed = false;
        this.stamina = Math.max(1, Math.ceil(this.maxStamina * SECOND_WIND_SHARE));
        this.gain("endurance", 3);
        this.say("secondWind", "Something in you won't stay down. You drag yourself back to your feet. (Second Wind)");
        break;
      case "stayDown":
        this.downed = false;
        this.taken = null;
        this.joined = [];
        this.say("lost", "You stay down. You've nothing left.");
        this.outcome = "lost";
        return;
      case "recover":
        this.dazed = false;
        this.say("recover", line(RECOVER_LINES, this.textRoll(), this.name));
        break;
      case "hands":
      case "mouth":
      case "ride": {
        const desire = this.desire;
        const def = INTIMATE_MOVES[move];
        if (!desire || desire.cock < def.cock || (def.wet && !this.wet)) return;
        this.foeStamina = Math.max(0, this.foeStamina - def.drain);
        this.addPleasure(def.pleasure);
        for (const m of METERS) this.stir(m, def.desire[m] ?? 0);
        this.acts[move] = (this.acts[move] ?? 0) + 1;
        this.gain("charm", 2);
        this.say(`intimate:${move}`, `${def.text} (-${def.drain})`);
        if (this.raiseFoe(def.drain * FOE_PLEASURE.intimatePerDrain)) break;
        if (this.foeStamina <= 0) {
          this.say("spent", "They're spent. They stagger out into the night grinning, and nobody quite knows where to look.");
          this.foeOut("spent");
        }
        break;
      }
      case "flaunt": {
        // KP's Flaunt: she shows herself off, and every one of them is worked up by it; so is she.
        this.say("flaunt", "You roll your hips and give the whole room a long, slow look at you.");
        this.stir("body", 4);
        this.stir("cock", 3);
        this.gain("charm", 2);
        this.crowdSays("lewd");
        const me = this.actor;
        for (let i = 0; i < this.foes.length && !this.outcome; i++) {
          if (this.foes[i].out) continue;
          this.actor = i;
          if (!this.foe.horny && this.random() < FLAUNT_HORNY) this.foe.horny = true;
          this.raiseFoe(FLAUNT_PLEASURE * (0.5 + this.exposure));
        }
        this.actor = me;
        break;
      }
      case "pullToys": {
        if (this.toys.size === 0) return;
        this.toys.clear();
        this.say("toys:out", "You pull everything out of you and toss it under a table.");
        break;
      }
      case "giveUp": {
        // KP's Give Up: she lets herself go down.
        this.stamina = 0;
        this.fallDown("You stop fighting it and let your legs give out.");
        return;
      }
      case "lead": {
        // KP: Karryn starts a sex skill herself. Her choice, so nothing to ask.
        const scene = this.leadScene();
        if (!scene) return;
        const def = FOE_SCENES[scene];
        this.taken = { area: def.area, scene, turns: 0, foe: this.target };
        this.countAct(def.area);
        this.gain("charm", 2);
        this.say(`taken:${def.area}`, `You take the lead. ${line(def.taken.length > 0 ? def.taken : TAKEN_LINES[def.area], this.textRoll(), this.name)}`);
        this.herSays("taken");
        this.mateSays("taken");
        this.crowdSays("taken");
        break;
      }
      case "struggle": {
        this.herSays("struggle");
        if (roll < c.struggle) {
          // Free of him, and of anyone joined in with him; he's the one left reeling.
          this.actor = this.taken!.foe;
          this.taken = null;
          this.joined = [];
          this.staggered = true;
          this.sayRolled("struggle", "free", line(STRUGGLE_LINES.free, this.textRoll(), this.name));
          this.gain("strength", 2);
          this.crowdSays("free");
        } else this.sayRolled("struggle", "fail", line(STRUGGLE_LINES.fail, this.textRoll(), this.name));
        break;
      }
      case "goAlong": {
        // It's the one she's in the scene with she's working on.
        this.actor = this.taken!.foe;
        const area = this.taken!.area;
        this.addPleasure(8);
        this.stir(METER_OF_AREA[area], 6);
        this.stir("cock", 3);
        this.countAct(area);
        this.gain("charm", 2);
        this.say(`taken:go:${area}`, line(GO_ALONG_LINES[area][SKILL_OF_VOICE[this.voiceFor("goAlong")]], this.textRoll(), this.name));
        this.herSays("goAlong");
        if (this.raiseFoe(FOE_PLEASURE.goAlong)) break;
        break;
      }
      case "throw":
        if (this.foeStamina > this.foeMax * THROW_AT) return;
        this.say("throw", "You haul them up by the collar and throw them out into the snow.");
        this.gain("strength", 3);
        this.foeOut("thrown");
        break;
    }
    this.eyeOpen = false;
    this.mindUsed = false;
    if (!this.foe.out && this.foeStamina <= 0) this.knockout();
    if (this.outcome) return;
    this.everyRound();
    if (this.outcome) return;
    this.theirTurns();
    if (this.edgeTurns > 0) this.edgeTurns--;
    this.stanceUsed = false;
    if (this.stance && --this.stanceTurns <= 0) {
      this.say("stance:end", `You drop out of your ${STANCE_NAMES[this.stance]}.`);
      this.stance = null;
    }
  }

  /** How much of her clothes are off, 0 to 1: by her clothes as they come off (7l), else what she came in with. */
  get exposure(): number {
    const pieces = this.stats.clothes?.pieces.length ?? 0;
    return pieces > 0 ? Math.min(1, this.clothesOff / pieces) : (this.stats.exposure ?? 0);
  }

  /** The next piece a foe would get off her, or null with nothing left (or no clothes in this fight). */
  get nextPiece(): string | null {
    return this.stats.clothes?.pieces[this.clothesOff] ?? null;
  }

  /** The last piece they had off her this brawl: what Fix Clothes puts back. */
  private get lastTorn(): string {
    return this.stats.clothes?.pieces[this.clothesOff - 1] ?? "clothes";
  }

  /** The one whose turn it is stops swinging and reaches for her, or her clothes: the fight waits for her answer. */
  private reach(what: "touch" | "clothes"): void {
    this.reaching = true;
    this.reacher = this.actor;
    this.reachingFor = what;
    this.clothesAtReach = this.clothesOff;
    this.dodging = false;
  }

  /** Consent off (KP): the next piece is torn off her, and it's said as any piece coming off is. */
  private tearPiece(): void {
    if (!this.nextPiece) return;
    this.clothesAtReach = this.clothesOff;
    this.clothesOff++;
    this.clothesCameOff();
  }

  /** How many pieces are off her now, as the tavern has it once she's answered a reach (7l). */
  setClothes(off: number): void {
    if (!this.stats.clothes) return;
    this.clothesOff = Math.max(0, Math.min(this.stats.clothes.pieces.length, off));
  }

  /** A piece has come off her (7l): what he did and said, hers, the room's and the others'; it works him up. */
  private clothesCameOff(): void {
    const piece = this.lastTorn;
    this.torn += this.clothesOff - this.clothesAtReach;
    this.say("their:stripped", `${withPiece(line(STRIPPED_LINES, this.textRoll(), this.name), piece)} "${line(STRIP_VOICES[this.kind], this.textRoll(), this.name)}"`);
    if (!this.nextPiece) this.say("bare", line(BARE_LINES, this.textRoll(), this.name));
    const voice = herVoice(this.stats.tier ?? "proper", this.horny, this.will);
    this.say("her:say", `You: "${line(HER_STRIPPED_LINES[voice], this.textRoll(), this.name)}"`);
    this.crowdSaysFrom(CROWD_STRIPPED_LINES);
    this.mateSaysFrom(MATE_STRIPPED_LINES);
    this.raiseFoe(FOE_PLEASURE.strip);
  }

  /** Into a stance (7k, KP's): paid for in energy, holds a few turns, and doesn't take her turn. */
  private takeStance(stance: Stance): void {
    if (this.taken || this.stanceUsed || this.stance === stance || this.energy < ENERGY_COST[stance]) return;
    this.energy -= ENERGY_COST[stance];
    this.stance = stance;
    this.stanceTurns = STANCE_TURNS;
    this.stanceUsed = true;
    const what = {
      cautious: "You keep your distance, watching their hands. (their aim worse, your dodges better)",
      open: "You stop fighting the feeling and let it show. (your desire rises faster; they want you more than they want a fight)",
      defensive: "You tuck your chin and set your feet. (their blows take less out of you, and can't pin you)",
      counter: "You wait for them to swing. (when they miss, you hit back)",
    }[stance];
    this.say(`stance:${stance}`, `${STANCE_NAMES[stance]}. ${what}`);
  }

  /**
   * Out of stamina: down, and out, unless she has the energy for her Second Wind (KP's down, stamina), once a brawl.
   * Either way, `text` says how she went down.
   */
  private fallDown(text: string): void {
    if (this.outcome || this.downed) return;
    if (!this.secondWindUsed && this.maxEnergy > 0 && this.energy >= ENERGY_COST.secondWind) {
      this.downed = true;
      this.say("down", `${text} You're down... but there's something left in you.`);
      return;
    }
    this.taken = null;
    this.joined = [];
    this.say("lost", text);
    this.outcome = "lost";
  }

  /** Counter Stance: they missed, and she hits back for half a strike. */
  private counterBlow(): void {
    const { levels } = this.stats;
    const damage = Math.max(1, Math.round(this.blow(3 + (levels.strength - 1) + this.damageBonus) * COUNTER_SHARE));
    this.foeStamina = Math.max(0, this.foeStamina - damage);
    this.say("counter", `You turn their swing and hit back. (-${damage})`);
    this.gain("agility", 1);
    if (this.foeStamina <= 0) this.knockout();
  }

  /** One of her willpower skills (7j), paid for and done; it doesn't take her turn. */
  private mind(move: FightMove): void {
    const desire = this.desire;
    const cost = this.mindCost(move);
    if (!desire || cost === null || this.mindUsed || this.will < cost) return;
    this.will -= cost;
    this.mindUsed = true;
    this.gain("mind", 2);
    const levels = this.stats.levels;
    switch (move) {
      case "deny": {
        this.denying = true;
        this.say("deny", "You make it plain: whoever finishes, finishes outside you. (Deny)");
        break;
      }
      case "suppress":
      case "suppressCock": {
        const cock = move === "suppressCock";
        const down = suppressAmount(levels.mind);
        for (const m of METERS) if (cock === (m === "cock")) desire[m] = Math.max(0, desire[m] - down);
        this.say(
          cock ? "suppress:cock" : "suppress",
          cock ? `You shove the thought of them out of your head. (Cock desire -${down})` : `You breathe slow and push the want back down. (desire -${down})`,
        );
        break;
      }
      case "release":
      case "releaseCock": {
        // KP's Release: she lets herself feel it, and opens up what she can do (and what they can).
        const cock = move === "releaseCock";
        for (const m of METERS) if (cock === (m === "cock")) desire[m] = Math.min(this.capOf(m), desire[m] + RELEASE_AMOUNT);
        this.say(cock ? "release:cock" : "release", cock ? `You stop fighting the thought of them. (Cock desire +${RELEASE_AMOUNT})` : `You let the want in, and stop pushing it away. (desire +${RELEASE_AMOUNT})`);
        break;
      }
      case "eye":
        this.eyeOpen = true;
        this.say("eye", "You watch them, and see exactly where they'll be. (next blow can't miss, and hits harder)");
        break;
      case "edge":
        this.edgeTurns = EDGE.turns;
        this.say("edge", `You hold yourself right at the edge, and no further. (you won't come for ${EDGE.turns} turns)`);
        break;
      case "seeNoEvil":
        this.seeUntil = this.turns + NO_EVIL_ROUNDS;
        this.say("seeNoEvil", `You fix your eyes on nothing and stop seeing them see you. (stares do ${Math.round(noEvilCut(levels.mind) * 100)}% less for 2 rounds)`);
        break;
      case "hearNoEvil":
        this.hearUntil = this.turns + NO_EVIL_ROUNDS;
        this.say("hearNoEvil", `You let their filth wash past you like rain. (lewd talk does ${Math.round(noEvilCut(levels.mind) * 100)}% less for 2 rounds)`);
        break;
      case "speakNoEvil": {
        const down = speakNoEvilDown(levels.mind);
        for (const m of LEWD_PARTS) desire[m] = Math.max(0, desire[m] - down);
        this.say("speakNoEvil", `Eyes shut, ears shut, mouth shut. The want drains out of you. (every desire -${down})`);
        break;
      }
      case "resist": {
        const down = Math.min(this.pleasure, RESIST_AMOUNT + (levels.mind - 1) * 3);
        this.pleasure -= down;
        this.say("resist", `You grit your teeth and fight it back down. (pleasure -${down})`);
        break;
      }
    }
  }

  /** Works her up; with Edging Control she stops just short, else at the top she comes (7j). */
  private addPleasure(n: number): void {
    if (n <= 0 || this.outcome) return;
    const top = this.edgeTurns > 0 ? EDGE.cap : FIGHT_PLEASURE_MAX;
    this.pleasure = Math.min(top, this.pleasure + n);
    if (this.pleasure >= FIGHT_PLEASURE_MAX) this.herClimax();
  }

  /**
   * She comes, right there mid-brawl (KP's orgasm in battle): her pleasure back to nothing, less willpower and
   * stamina, and she's reeling till her next turn. The room and the foes have plenty to say about it.
   */
  private herClimax(): void {
    this.climaxes++;
    this.pleasure = 0;
    this.will = Math.max(0, this.will - CLIMAX.will);
    this.energy = Math.max(0, this.energy - CLIMAX_ENERGY);
    this.stamina = Math.max(0, this.stamina - CLIMAX.stamina);
    this.dazed = true;
    this.edgeTurns = 0;
    this.say("her:come", line(this.taken ? CLIMAX_LINES.scene : CLIMAX_LINES.fight, this.textRoll(), this.name));
    const voice = herVoice(this.stats.tier ?? "proper", this.horny, this.will);
    this.say("her:say", `You: "${line(HER_CLIMAX_LINES[voice], this.textRoll(), this.name)}"`);
    this.crowdSpoke = false;
    this.crowdSays("herCome");
    this.mateSpoke = false;
    if (!this.foe.out) this.mateSays("herCome", true);
    if (this.stamina <= 0) this.fallDown("Your legs give out under you.");
  }

  /** The one whose turn it is goes down and stays down. */
  private knockout(): void {
    this.say("knockout", this.foes.length > 1 ? `The ${this.name} goes down and stays down.` : "They go down and stay down. A couple of regulars carry them out.");
    this.foeOut("knocked");
  }

  /**
   * The one whose turn it is is out of it, and how. Out of any scene she's in with him, too. Once they're all out,
   * it's over: talked down if words did it, else won. If it was the one she was going for, she turns on the next.
   */
  private foeOut(how: FoeOut): void {
    const foe = this.foe;
    foe.out = how;
    if (foe === this.lead && how === "spent") this.spent = true;
    if (this.taken?.foe === this.actor) {
      this.taken = null;
      this.joined = [];
    }
    this.joined = this.joined.filter((j) => j.foe !== this.actor);
    if (this.offering && this.offerer === this.actor) this.clearOffer();
    const standing = this.standing;
    if (standing.length === 0) {
      const words = this.foes.every((f) => f.out === "talked" || f.out === "stared") && this.foes.some((f) => f.out === "talked");
      this.outcome = words ? "talked" : "won";
      return;
    }
    if (how !== "spent") this.mateSays("down");
    if (this.target === this.actor) {
      this.target = this.foes.indexOf(standing[0]);
      this.holding = false;
    }
  }

  /** Each of them still in it takes a turn, unless one's stopped the fight to reach for her; then their table may pile in. */
  private theirTurns(): void {
    for (let i = 0; i < this.foes.length && !this.outcome; i++) {
      if (this.foes[i].out) continue;
      if (this.reaching || this.offering || this.downed) break;
      this.actor = i;
      this.theirTurn();
    }
    if (!this.outcome && !this.reaching && !this.offering && !this.downed) this.maybeJoinBrawl();
    this.actor = this.target;
  }

  /** The next of their table may jump into the brawl (KP's bar brawl join), while there's room for one more. */
  private maybeJoinBrawl(): void {
    const next = this.joinQueue[0];
    if (!next || this.standing.length >= MAX_FOES) return;
    if (this.random() >= JOIN_BRAWL * (next.drunk || next.horny ? 1.5 : 1)) return;
    this.joinQueue.shift();
    this.foes.push(this.makeFoe(next));
    this.actor = this.foes.length - 1;
    this.say("join", `The ${this.name} from their table jumps into the brawl!`);
    this.mateSays("joinBrawl", true);
  }

  /** What steeling herself gives back: more the cooler her head. */
  private steelStamina(): number {
    return STEEL_STAMINA + Math.max(0, this.stats.levels.mind - 1);
  }

  private theirTurn(): void {
    if (this.staggered) {
      this.staggered = false;
      this.say("staggered", `The ${this.name} is still finding their feet. (no attack)`);
      return;
    }
    // KP's toys: whatever's in her works on her, his turn and every one of theirs.
    this.toysWork();
    // In a scene with her, he keeps at it, and anyone joined in with him; nobody swings at her (KP's sex poses).
    // The rest want in.
    if (this.taken) {
      if (this.taken.foe === this.actor) this.theirPose();
      else if (this.joined.some((j) => j.foe === this.actor)) this.joinedPose();
      else this.mateTurn();
      return;
    }
    // Karryn-style (brawlai.ts): watching her bare works him up; then he wants her, or her hurt.
    if (this.desire) {
      if (this.raiseFoe(FOE_PLEASURE.watch * this.exposure)) return;
      // Open Pleasure: they'd rather have her than hurt her.
      const foe = { horny: this.foeHorny, angry: this.foeAngry, anger: this.stance === "open" ? 0 : this.foeAnger, pleasure: this.foePleasure };
      if (wantsHer(foe, this.random())) {
        // Erect, and she's ready for it: he starts a scene (never with either of them too drunk: the consent rule).
        // Which: one of his kind's (KP's), or the part his type goes for (brawlscenes.ts).
        const scene = erect(foe) && this.stats.sexOk && !this.drunk ? pickFoeScene(this.kind, this.foe.prefers, this.herState(), this.random()) : null;
        if (scene) {
          this.dodging = false;
          this.offerScene(scene, false);
          return;
        }
        if (this.lewdTurn()) return;
      }
    }
    // Worked up, they may stop swinging and reach for her: the fight waits for her answer on the touch screen.
    // Her Cock desire draws them on, and once it burns, any foe might.
    const p = this.penalties;
    const tempted = this.foe.horny || (this.desire?.cock ?? 0) >= HORNY_AT;
    if (tempted && this.reaches < MAX_REACHES && this.random() < REACH_IN_BRAWL + p.reach + (this.stats.brawlReach ?? 0)) {
      this.reaches++;
      this.reach("touch");
      this.say("their:reach", `The ${this.name} stops swinging and reaches for you instead.`);
      return;
    }
    // Breasts desire makes her slow to twist away.
    // Cautious Stance: her dodges better, their aim worse. Tired, she's slower to get out of the way.
    const cautious = this.stance === "cautious";
    const dodge = this.dodging
      ? Math.max(0, 0.35 + (this.stats.levels.agility - 1) * 0.03 + this.stats.dodge - p.dodge - this.tired * 0.3 + (cautious ? CAUTIOUS.dodge : 0))
      : 0;
    const dodged = this.dodging;
    this.dodging = false;
    // Her hold on their arm throws their swing off; they shake loose as they swing.
    const off = (this.holding ? HOLD_ACCURACY : 0) + (cautious ? CAUTIOUS.theirAim : 0);
    const aim = this.foeAccuracy - dodge - off;
    const hit = this.random() < aim;
    const tag = this.rollTag(foeTag(this.name), "Attack", aim, hit);
    if (hit) {
      this.theirBlow(tag);
    } else {
      this.say(dodged ? "their:dodged" : "their:miss", tag + (dodged ? "You duck under their swing." : "They swing wide."));
      if (dodged) {
        this.dodges++;
        this.gain("agility", 3);
      }
      if (this.stance === "counter") this.counterBlow();
    }
    if (this.stamina <= 0) this.fallDown("You go down hard.");
  }

  /** His type's voice (brawlvoices.ts). */
  private get voice() {
    return VOICES[this.kind];
  }

  /**
   * A roll for picking a line of the log, kept apart from the fight's own dice so what's said never changes how it
   * goes: well spread, and different for each foe.
   */
  private textRoll(): number {
    this.texts++;
    const x = Math.sin(this.texts * 12.9898 + (this.guestId + 7) * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  /** One of his lines, in quotes. */
  private heSays(lines: readonly string[]): string {
    return `"${line(lines, this.textRoll(), this.name)}"`;
  }

  /**
   * How she talks: in a scene, by how used she is to that act (her first time, then more at ease); otherwise by her
   * Slut Level; horny or broken over either (brawlher.ts).
   */
  private voiceFor(moment: HerMoment | "come", area: DuelArea | null = this.taken?.area ?? null): HerVoice {
    const scene = moment === "come" || SCENE_MOMENTS.has(moment as HerMoment);
    const tier = scene && area ? experienceTier(this.stats.experience?.[area] ?? 0) : (this.stats.tier ?? "proper");
    return herVoice(tier, this.horny, this.will);
  }

  /** Her answer in the log (brawlher.ts). */
  private herSays(moment: HerMoment): void {
    this.say("her:say", `You: "${line(HER_LINES[moment][this.voiceFor(moment)], this.textRoll(), this.name)}"`);
  }

  /** Her, when he comes: by where he had her (KP's swallow, creampie and bukkake lines). */
  private herSaysCome(area: DuelArea | "none"): void {
    const voice = this.voiceFor("come", area === "none" ? null : area);
    this.say("her:say", `You: "${line(HER_COME_LINES[area][voice], this.textRoll(), this.name)}"`);
  }

  /** Someone in the room shouts, now and then: at most once a turn. */
  private crowdSays(moment: CrowdMoment): void {
    this.crowdSaysFrom(CROWD_LINES[moment]);
  }

  private crowdSaysFrom(lines: readonly string[]): void {
    const crowd = this.stats.crowd;
    if (!crowd?.length || this.crowdSpoke || this.textRoll() >= CROWD_CHANCE) return;
    this.crowdSpoke = true;
    const who = crowd[Math.floor(this.textRoll() * crowd.length) % crowd.length];
    this.say("crowd", line(lines, this.textRoll(), this.name).replaceAll("{Who}", who));
  }

  /** What a foe needs to know of her to start a scene (brawlai.ts SCENE_NEEDS). */
  private herState(): HerReadiness {
    const { experience, rimjob, footjob } = this.stats;
    return { desire: this.desire!, wet: this.wet, exposure: this.exposure, experience, rimjob, footjob, ease: this.stats.sceneEase };
  }

  /**
   * Him (the actor) putting a scene to her: starting one, or moving the one she's in on to a bolder one. The fight
   * waits for her answer (`answerOffer`); Consent off, the tavern answers yes for her.
   */
  private offerScene(scene: FoeSceneId, upgrade: boolean): void {
    const def = FOE_SCENES[scene];
    this.offering = def.area;
    this.offeringScene = scene;
    this.offerUpgrade = upgrade;
    this.offerer = this.actor;
    this.offerSlot = null;
    const lines = def.offer.length > 0 ? def.offer : OFFER_LINES[def.area];
    this.say(`their:offer:${def.area}`, `${line(lines, this.textRoll(), this.name)} ${this.heSays(this.voice.offer)}`);
  }

  /** His toy, offered (KP's toy insertion), if he carries one and she's ready for one she hasn't got in. */
  private tryToy(): boolean {
    if (!this.desire || !TOY_KINDS.has(this.kind) || this.random() >= TOY_CHANCE) return false;
    const toy = (Object.keys(TOYS) as ToyId[]).find((t) => {
      const def = TOYS[t];
      return !this.toys.has(t) && this.desire![def.meter] >= def.need && (!def.wet || this.wet) && this.exposure >= def.exposure;
    });
    if (!toy) return false;
    const def = TOYS[toy];
    this.offering = def.meter === "butt" ? "butt" : "pussy";
    this.offeringToy = toy;
    this.offerer = this.actor;
    this.offerSlot = null;
    this.say(`toy:offer:${toy}`, line(def.offer, this.textRoll(), this.name));
    return true;
  }

  /** Each toy in her works on her (a turn of theirs): its desire, and her pleasure. */
  private toysWork(): void {
    if (this.toys.size === 0 || this.actor !== this.standingIndex()) return;
    for (const toy of this.toys) {
      const def = TOYS[toy];
      this.stir(def.meter, def.per);
      this.addPleasure(def.per);
      if (this.textRoll() < 0.4) this.say(`toy:work:${toy}`, line(def.worn, this.textRoll(), this.name));
    }
  }

  /** The first of them still standing: whose turn the toys work on, once a round. */
  private standingIndex(): number {
    return this.foes.findIndex((f) => !f.out);
  }

  private clearOffer(): void {
    this.offering = null;
    this.offeringToy = null;
    this.offeringScene = null;
    this.offerUpgrade = false;
    this.offerSlot = null;
  }

  /**
   * Her kick, caught (KP's kick counter): the one she kicked, if he's a bandit or an adventurer, erect, and she's
   * ready for it, may catch her leg and put the scene to her. Says whether he did.
   */
  private tryKickCounter(): boolean {
    if (!this.desire || !this.stats.sexOk || this.drunk || this.taken) return false;
    const chance = kickCounterChance(
      this.kind,
      { erect: erect({ horny: this.foeHorny, pleasure: this.foePleasure }), horny: this.foeHorny, angry: this.foeAngry },
      { ...this.herState(), horny: this.horny },
    );
    if (chance <= 0 || this.random() >= chance) return false;
    this.offerScene("kickCounter", false);
    return true;
  }

  /** How many new ones have talked lewd at her about a part this brawl. */
  private talkedAbout(part: LewdPart): number {
    return this.talkersAbout[part]?.size ?? 0;
  }

  /** How many new ones have stared at a part of her this brawl. */
  private staredAt(part: LewdPart): number {
    return this.starersAbout[part]?.size ?? 0;
  }

  /** Whether See No Evil, or Hear No Evil, is holding (KP's willpower skills). */
  get seeing(): boolean {
    return this.turns <= this.seeUntil;
  }
  get hearing(): boolean {
    return this.turns <= this.hearUntil;
  }

  /** What See or Hear No Evil leaves of a stare or a line: all of it, unless she's shutting it out. */
  private noEvilLeft(on: boolean): number {
    return on ? 1 - noEvilCut(this.stats.levels.mind) : 1;
  }

  /**
   * What happens every round before they move, from her talk and sight passives (KP's "every turn"): the desire her
   * sight passives raise, wetter for every one who's talked about her pussy, and pleasure while she's bare in front of
   * them. Shut out by See No Evil, the looking parts are.
   */
  private everyRound(): void {
    const t = this.stats.lewdTalk;
    if (!t || !this.desire) return;
    const see = this.noEvilLeft(this.seeing);
    for (const part of LEWD_PARTS) {
      const every = (t.sightEvery[part] ?? 0) + Math.min(SIGHT_EVERY_PER.max, this.staredAt(part) * (t.sightEveryPer[part] ?? 0));
      if (every > 0) this.stir(part, every * see);
    }
    this.talkWet();
    if (t.naked > 0 && this.exposure >= NAKED_AT) {
      const men = Math.min(NAKED_MEN_MAX, this.standing.length);
      const n = Math.round(men * t.naked * NAKED_PLEASURE * see);
      if (n > 0) {
        this.say("her:nakedLooks", `Bare in front of all of them, their eyes are all over you. (+${n} pleasure)`);
        this.sightPleasure += n;
        this.addPleasureCounting(n, "sight");
      }
    }
  }

  /** Works her up, and if that makes her come, counts it to talk or stares. */
  private addPleasureCounting(n: number, from: "talk" | "sight"): void {
    const before = this.climaxes;
    this.addPleasure(n);
    if (this.climaxes > before) {
      if (from === "talk") this.talkClimaxes++;
      else this.sightClimaxes++;
    }
  }

  /**
   * He stares at what's bare (KP's dmgFormula_basicSight): her desire for it, her pleasure once she likes being
   * looked at (her sight sensitivity), and her sight passives on top.
   */
  private lewdSight(part: LewdPart): void {
    const t = this.stats.lewdTalk;
    const pre = this.foe.prefix ? FOE_PREFIXES[this.foe.prefix] : undefined;
    const lvl = pre?.sight ? STARER_LEVEL : 0;
    const staring = this.starers.size;
    const sense =
      (t?.sightSense ?? 0) +
      perTalker(this.staredAt("breasts"), t?.sightSenseBreasts ?? 0, SIGHT_SENSE_PER.max) +
      perTalker(staring, t?.sightSensePer ?? 0, SIGHT_SENSE_PER.max);
    const gain = sightGain({ lvl, sense, rate: t?.sightRate ?? 0 });
    // Talk about her breasts makes stares get to her more (Talk of My Chest); every new one staring, more again (Leering Pleasure).
    const more = perTalker(this.talkedAbout("breasts"), t?.sight ?? 0, TALK_SIGHT.max) + perTalker(staring, t?.sightRatePer ?? 0, SIGHT_RATE_PER.max);
    const stack = perTalker(this.staredAt(part), t?.sightStack[part] ?? 0, SIGHT_STACK.max);
    const see = this.noEvilLeft(this.seeing);
    const meter = LEWD_METER[part];
    const n = this.stir(meter, gain.desire * (1 + more) * (1 + stack) * see);
    let pleasure = gain.pleasure * (1 + more) * see;
    if (t?.sightCrit && this.horny) pleasure *= 2;
    pleasure = Math.round(pleasure);
    this.sightings++;
    this.seenAt[part] = (this.seenAt[part] ?? 0) + 1;
    this.starers.add(this.actor);
    (this.starersAbout[part] ??= new Set()).add(this.actor);
    const seen = line(SIGHT_LINES[part], this.textRoll(), this.name);
    const tags = [n > 0 ? `+${n} ${METER_NAMES[meter]} desire` : "", pleasure > 0 && this.desire ? `+${pleasure} pleasure` : ""].filter(Boolean);
    this.say(`their:sight:${part}`, `${seen}${tags.length > 0 ? ` (${tags.join(", ")})` : ""}`);
    this.herSays("sight");
    this.crowdSays("lewd");
    if (pleasure > 0 && this.desire) {
      this.sightPleasure += pleasure;
      const before = this.climaxes;
      this.addPleasureCounting(pleasure, "sight");
      if (this.climaxes > before) this.say("her:sightCome", "Nobody laid a hand on you. They only looked.");
    }
    this.raiseFoe(FOE_PLEASURE.sight);
  }

  /** Her damage: her own, and what her talk passives add or take off for every new one who's talked lewd at her. */
  private get damageBonus(): number {
    const per = this.stats.lewdTalk?.damage ?? 0;
    return this.stats.damage + Math.round(perTalker(this.talkers.size, per, 3));
  }

  /** What every new one who's talked lewd at her takes off talking or staring them down (Hang on Every Word, KP's Mind down). */
  private get talkMind(): number {
    return perTalker(this.talkers.size, this.stats.lewdTalk?.mindDown ?? 0, 0.2);
  }

  /** Pussy's second talk passive: every turn, she's wetter for every new one who's talked about her pussy (KP). */
  private talkWet(): void {
    const per = this.stats.lewdTalk?.wet ?? 0;
    if (per > 0) this.stir("pussy", this.talkedAbout("pussy") * per);
  }

  /** The thirds: when one comes in or on a part they've talked about, she feels it more (KP's swallow, bukkake, creampie sensitivity). */
  private talkCome(area: DuelArea | "none"): void {
    if (area === "none" || area === "hands" || !this.desire) return;
    const per = this.stats.lewdTalk?.come[area] ?? 0;
    const n = Math.round(Math.min(TALK_COME.max, this.talkedAbout(area) * per));
    if (n <= 0) return;
    this.say("her:talkComeFeel", `Every filthy word they said about it rings in your head. (+${n} pleasure)`);
    this.addPleasure(n);
  }

  /** Works the foe up; at the top he comes, and he's spent: the fight's won. Says whether he came. */
  private raiseFoe(n: number): boolean {
    if (n <= 0 || this.outcome) return false;
    this.foePleasure = Math.min(FOE_PLEASURE_MAX, this.foePleasure + n * this.foe.rate);
    if (this.foePleasure < FOE_PLEASURE_MAX) return false;
    // Denied (KP's Deny Ejaculation): he pulls out of her mouth, pussy or rear before he comes.
    const at = this.sceneAreaOf(this.actor);
    const area = this.denying && (at === "mouth" || at === "pussy" || at === "butt") ? "none" : at;
    if (area !== at) this.say("their:denied", `The ${this.name} pulls out of you just in time, cursing.`);
    this.say("their:come", `${line(COME_LINES[area], this.textRoll(), this.name)} ${this.heSays(this.voice.come)}`);
    this.herSaysCome(area);
    this.talkCome(area);
    this.crowdSays("come");
    this.mateSays("come");
    this.comes++;
    // More in him (KP's ejaculation stock): he's out of the scene, but not the fight, and slower to get there again.
    if (this.foe.stock > 1) {
      this.foe.stock--;
      this.foe.pleasure = 0;
      this.foe.rate *= AFTER_COME_RATE;
      if (this.taken?.foe === this.actor) {
        this.taken = null;
        this.joined = [];
      }
      this.joined = this.joined.filter((j) => j.foe !== this.actor);
      this.say("their:again", `The ${this.name} isn't done yet. He catches his breath and comes back for more.`);
      return true;
    }
    this.foeOut("spent");
    return true;
  }

  /**
   * Instead of fighting, with no scene to be had: a grope (asked on the touch screen like any reach), lewd talk at
   * her, or a stare at what's bare (KP's petting, talk and sight). Says whether he did one.
   */
  private lewdTurn(canGrope = true): boolean {
    // KP's stripping: he goes for her clothes, asked like any reach (7l). Only while she has any left to lose.
    if (canGrope && this.reaches < MAX_REACHES_WANTING && this.nextPiece && this.random() < STRIP_CHANCE) {
      this.reaches++;
      this.say("their:strip", withPiece(line(STRIP_REACH_LINES, this.textRoll(), this.name), this.nextPiece));
      // Consent off (KP): it's torn off her, no question.
      if (this.stats.forceful) this.tearPiece();
      else this.reach("clothes");
      return true;
    }
    const exposure = this.exposure;
    // KP's toys: one who carries them may put one in her, if she's ready for it.
    if (this.tryToy()) return true;
    // A talker would rather talk, a starer stare (KP's Talk and Sight prefixes).
    let roll = this.random();
    const pre = this.foe.prefix ? FOE_PREFIXES[this.foe.prefix] : undefined;
    if (pre?.talk) roll = Math.min(0.99, roll + pre.talk);
    if (pre?.sight && roll >= 0.4) roll = 0.45;
    // Her talk passives: talk about her rear (and, past Words Like Hands, any talk) has them reaching for her more.
    const tk = this.stats.lewdTalk;
    if (tk) {
      const reach =
        perTalker(this.talkers.size, tk.grope, 0.15) +
        perTalker(this.talkedAbout("butt"), tk.gropeButt, TALK_GROPE.max) +
        perTalker(this.staredAt("butt"), tk.sightGropeButt, TALK_GROPE.max);
      roll = Math.max(0, roll - reach);
    }
    const turn = lewdTurn(this.foe.prefers, exposure, canGrope && this.reaches < MAX_REACHES_WANTING, roll, this.random());
    if (turn.kind === "grope") {
      this.reaches++;
      this.reach("touch");
      this.say("their:reach", `The ${this.name} stops swinging and reaches for you instead.`);
      return true;
    }
    if (turn.kind === "talk") this.lewdTalk(turn.part);
    else this.lewdSight(turn.part);
    return true;
  }

  /**
   * He talks lewd at her about a part of her (lewdtalk.ts, KP's dmgFormula_basicTalk): her desire for it, and her
   * pleasure once she's learned to like hearing it. Erect and not angry, he strokes himself as he says it (KP's jerk-off
   * talk). What he says goes by what the room knows about her.
   */
  private lewdTalk(at: LewdPart): void {
    const t = this.stats.lewdTalk;
    // Her weak spots posted (KP's Publish Sensitivities): half the time he goes for the part she's most sensitive in.
    const part = t?.aim && this.textRoll() < 0.5 ? this.weakest() : at;
    const meter = LEWD_METER[part];
    const pre = this.foe.prefix ? FOE_PREFIXES[this.foe.prefix] : undefined;
    const talkLvl = pre?.talk ? TALKER_LEVEL : 0;
    // KP's canJerkOff: erect, not angry, and with something left in him.
    const jerking = Boolean(this.desire) && !this.foeAngry && this.foe.stock > 0 && erect({ horny: this.foeHorny, pleasure: this.foePleasure });
    const gain = talkGain({ talkLvl, sense: t?.sense ?? 0, rate: t?.rate ?? 0, jerk: jerking ? (t?.jerk ?? 0) : 0, spread: this.random() });
    // Mouth's and Cock's second talk passives: every new one who talks about it this brawl stirs her more (KP).
    const heard = this.talkedAt[part] ?? 0;
    const stack = perTalker(this.talkedAbout(part), t?.stack[part] ?? 0, part === "cock" ? COCK_STACK.max : TALK_STACK.max);
    // Hear No Evil: she shuts most of it out.
    const hear = this.noEvilLeft(this.hearing);
    const n = this.stir(meter, gain.desire * (1 + stack) * hear);
    let pleasure = gain.pleasure * hear;
    if (t?.crit && this.horny) pleasure *= 2;
    pleasure = Math.round(pleasure);
    const opener = jerking ? line(JERK_TALK_LINES, this.textRoll(), this.name) : `The ${this.name} leers at you.`;
    const said = this.heSays(this.talkLines(part));
    const tags = [n > 0 ? `+${n} ${METER_NAMES[meter]} desire` : "", pleasure > 0 && this.desire ? `+${pleasure} pleasure` : ""].filter(Boolean);
    this.say(`their:talk:${part}`, `${opener} ${said}${tags.length > 0 ? ` (${tags.join(", ")})` : ""}`);
    this.herSays("talk");
    this.crowdSays("lewd");
    this.talkedAt[part] = heard + 1;
    this.talkers.add(this.actor);
    (this.talkersAbout[part] ??= new Set()).add(this.actor);
    if (jerking) this.jerkedAt++;
    // Cock's third talk passive: hearing it tips her straight into horny (KP: 15%).
    if (part === "cock" && this.desire && t && t.horny > 0 && this.random() < t.horny && !this.horny) {
      this.desire.cock = Math.max(this.desire.cock, Math.min(this.capOf("cock"), HORNY_AT));
      if (this.horny) this.say("her:hornyTalk", "Something in you gives at the word. You're burning for it now. (horny)");
    }
    if (pleasure > 0 && this.desire) {
      this.talkPleasure += pleasure;
      const before = this.climaxes;
      this.addPleasureCounting(pleasure, "talk");
      if (this.climaxes > before) this.say("her:talkCome", "He never laid a finger on you. His words did that.");
    }
    this.raiseFoe(FOE_PLEASURE.talk + (jerking ? JERK_PLEASURE : 0));
  }

  /** The part of her she's most sensitive in (her passives), the most worked up as the tie-break. */
  private weakest(): LewdPart {
    const score = (p: LewdPart) => (this.stats.sens?.[p] ?? 0) * 100 + (this.desire?.[p] ?? 0);
    return LEWD_PARTS.reduce((a, b) => (score(b) > score(a) ? b : a));
  }

  /** What a foe says about a part of her: his own type's lines, or, more often than not, what the room knows of her. */
  private talkLines(part: LewdPart): readonly string[] {
    const own = this.voice.talk[part];
    const area: DuelArea = part === "cock" ? "hands" : part;
    const t = this.stats.lewdTalk;
    const rep = talkRep(this.stats.tier, (this.stats.fame ?? 0) + (t?.known ?? 0), this.stats.experience?.[area] ?? 0, t?.firsts ?? false);
    if (rep === "plain") return own;
    return this.textRoll() < REP_LINE_SHARE ? REP_TALK_LINES[rep][part] : own;
  }

  /** His turn in a scene with her: it wears on her, works her up, and works him towards the top. */
  private theirPose(): void {
    const taken = this.taken!;
    taken.turns++;
    this.stamina = Math.max(0, this.stamina - 1);
    this.will = Math.max(0, this.will - 1);
    this.addPleasure(6);
    this.stir(METER_OF_AREA[taken.area], 5);
    // What he does, and now and then what he says doing it; her, as it goes on; the room, cheering him on.
    const said = this.textRoll() < 0.5 ? ` ${this.heSays(this.voice.pose)}` : "";
    const def = FOE_SCENES[taken.scene];
    const lines = def.pose_.length > 0 ? def.pose_ : POSE_LINES[taken.area];
    this.say(`their:pose:${taken.area}`, `${line(lines, this.textRoll(), this.name)}${said}`);
    if (this.textRoll() < 0.6) this.herSays("pose");
    this.crowdSays("pose");
    if (this.raiseFoe(FOE_PLEASURE.pose)) return;
    if (this.stamina <= 0) {
      this.fallDown("Your legs give out under you.");
      return;
    }
    // Worked up, he may want more: a bolder scene of his, if she's ready for it (KP's tryUpgradeSexPose).
    if (taken.turns >= UPGRADE_AFTER && !this.drunk && this.random() * 100 < this.foePleasure * UPGRADE_SHARE) {
      const next = upgradeScene(this.kind, this.foe.prefers, taken.scene, this.herState(), this.random());
      if (next) this.offerScene(next, true);
    }
  }

  /** The part of her a foe has in a scene: the scene's, or his slot's if he's joined in; "none" if he isn't in it. */
  private sceneAreaOf(index: number): DuelArea | "none" {
    if (this.taken?.foe === index) return this.taken.area;
    const join = this.joined.find((j) => j.foe === index);
    return join ? SLOT_AREA[join.slot] : "none";
  }

  /** A slot she's free at, and ready for: her mouth (unless it's the scene), then her hands. */
  private freeSlot(): JoinSlot | null {
    const taken = this.taken;
    if (!taken || !this.desire) return null;
    const used = new Set(this.joined.map((j) => j.slot));
    // The slots the scene leaves free (KP's pose joins), that she's ready for, and he'd go for (brawlscenes.ts).
    const slots = joinSlots(taken.scene, this.kind, this.herState());
    return slots.find((s) => !used.has(s)) ?? null;
  }

  /**
   * One of them, while she's in a scene with another: erect, he wants in (his pleasure against a roll, easier if
   * he's horny: KP's tryJoinSexPose), at a free slot; otherwise watching works him up, and he talks or stares.
   */
  private mateTurn(): void {
    const foe = this.foe;
    if (this.desire && this.stats.sexOk && !foe.drunk && erect(foe) && this.random() * (foe.horny ? 30 : 80) < foe.pleasure) {
      const slot = this.freeSlot();
      if (slot) {
        this.offering = SLOT_AREA[slot];
        this.offerer = this.actor;
        this.offerSlot = slot;
        this.say(`their:join:${slot}`, `${line(JOIN_LINES[slot], this.textRoll(), this.name)} ${this.heSays(this.voice.offer)}`);
        return;
      }
    }
    if (this.raiseFoe(FOE_PLEASURE.watch * 2)) return;
    this.lewdTurn(false);
  }

  /** His turn joined in with her, at her mouth or in her hand. */
  private joinedPose(): void {
    const join = this.joined.find((j) => j.foe === this.actor)!;
    const area = SLOT_AREA[join.slot];
    this.addPleasure(4);
    this.stir(METER_OF_AREA[area], 3);
    const said = this.textRoll() < 0.4 ? ` ${this.heSays(this.voice.pose)}` : "";
    this.say(`their:pose:${area}`, `${line(JOINED_POSE_LINES[join.slot], this.textRoll(), this.name)}${said}`);
    this.crowdSays("pose");
    this.raiseFoe(FOE_PLEASURE.pose);
  }

  /**
   * The foes among themselves (KP's enemies egging each other on): one of the others, or with `self` the one whose
   * turn it is, says a word about it. At most one a turn.
   */
  private mateSays(moment: MateMoment, self = false): void {
    this.mateSaysFrom(FOE_CHATTER[moment], self);
  }

  private mateSaysFrom(lines: readonly string[], self = false): void {
    if (this.mateSpoke) return;
    const others = this.foes.map((f, i) => ({ f, i })).filter(({ f, i }) => !f.out && i !== this.actor);
    const speaker = self ? this.foe : others[Math.floor(this.textRoll() * others.length) % Math.max(1, others.length)]?.f;
    if (!speaker || (!self && this.textRoll() >= MATE_CHANCE)) return;
    this.mateSpoke = true;
    const text = line(lines, this.textRoll(), speaker.name).replaceAll("{mate}", `the ${this.name}`);
    this.say("foe:say", text);
  }

  /** What she did with him in a scene, for the records. */
  private countAct(area: DuelArea): void {
    const act = ACT_OF_AREA[area];
    if (act) this.acts[act] = (this.acts[act] ?? 0) + 1;
  }

  /**
   * Her answer to a foe starting a scene with her (asked like a reach; GAME_PATH.MD 7i). Yes, and she's in it with
   * him till he comes or she breaks free; a slap rocks him back; pulling away always gets her clear.
   */
  answerOffer(answer: "yes" | "slap" | "pull"): void {
    const area = this.offering;
    if (!area || this.outcome) return;
    const scene = this.offeringScene ?? (area as FoeSceneId);
    const upgrade = this.offerUpgrade;
    const toy = this.offeringToy;
    const slot = this.offerSlot;
    this.clearOffer();
    this.crowdSpoke = false;
    this.mateSpoke = false;
    this.actor = this.offerer;
    try {
      if (toy) this.answerToyAs(toy, answer);
      else if (upgrade) this.answerUpgradeAs(scene, answer);
      else this.answerOfferAs(area, slot, answer, scene);
    } finally {
      this.actor = this.target;
    }
  }

  /**
   * Her answer to him moving the scene she's in on to a bolder one. Yes, and it's the new one (anyone joined at a
   * slot it doesn't leave free drops out); a slap keeps it as it was; pulling away gets her clear of all of them.
   */
  private answerUpgradeAs(scene: FoeSceneId, answer: "yes" | "slap" | "pull"): void {
    const taken = this.taken;
    if (!taken) return;
    if (answer === "yes") {
      const def = FOE_SCENES[scene];
      taken.scene = scene;
      taken.area = def.area;
      taken.turns = 0;
      const keep = new Set(def.joins);
      this.joined = this.joined.filter((j) => keep.has(j.slot));
      this.countAct(def.area);
      const lines = def.taken.length > 0 ? def.taken : TAKEN_LINES[def.area];
      this.say(`taken:${def.area}`, line(lines, this.textRoll(), this.name));
      this.herSays("taken");
      this.mateSays("taken");
      this.crowdSays("taken");
      return;
    }
    this.herSays("refuse");
    this.say("their:say", `The ${this.name}: ${this.heSays(this.voice.refused)}`);
    if (answer === "slap") {
      this.say("reach:slap", "You slap his hand away. He'll have to make do with what he's got.");
      return;
    }
    this.taken = null;
    this.joined = [];
    this.staggered = true;
    this.say("struggle:free", "You twist out from under him and get your feet back.");
    this.crowdSays("free");
  }

  /** Her answer to his toy: in it goes, or she turns it away. */
  private answerToyAs(toy: ToyId, answer: "yes" | "slap" | "pull"): void {
    if (answer === "yes") {
      this.toys.add(toy);
      this.toysIn++;
      this.say(`toy:in:${toy}`, `${TOYS[toy].name.charAt(0).toUpperCase()}${TOYS[toy].name.slice(1)} goes in, and the room cheers.`);
      this.raiseFoe(FOE_PLEASURE.touch);
      return;
    }
    this.say(answer === "slap" ? "reach:slap" : "reach:pull", answer === "slap" ? "You knock it out of his hand." : "You twist away from it.");
  }

  private answerOfferAs(area: DuelArea, slot: JoinSlot | null, answer: "yes" | "slap" | "pull", scene: FoeSceneId = area): void {
    if (answer === "yes" && slot && this.taken) {
      // Joined in, at her mouth or a hand.
      this.joined.push({ foe: this.actor, slot });
      this.countAct(area);
      this.say(`joined:${slot}`, line(JOINED_LINES[slot], this.textRoll(), this.name));
      this.herSays("taken");
      this.mateSays("joined");
      this.crowdSays("taken");
      return;
    }
    if (answer === "yes") {
      this.taken = { area, scene, turns: 0, foe: this.actor };
      this.countAct(area);
      const def = FOE_SCENES[scene];
      this.say(`taken:${area}`, line(def.taken.length > 0 ? def.taken : TAKEN_LINES[area], this.textRoll(), this.name));
      this.herSays("taken");
      this.mateSays("taken");
      this.crowdSays("taken");
      return;
    }
    // Turned down: she says so, and he doesn't take it well; the room enjoys it.
    this.herSays("refuse");
    this.say("their:say", `The ${this.name}: ${this.heSays(this.voice.refused)}`);
    this.crowdSays("refused");
    if (answer === "slap") {
      const sting = 2 + (this.stats.brawlSlap ?? 0);
      this.foeStamina = Math.max(0, this.foeStamina - sting);
      this.say("reach:slap", `Your slap rocks them back on their heels. (-${sting})`);
      if (this.foeStamina <= 0) this.knockout();
      return;
    }
    this.say("reach:pull", "You twist clear and get your guard back up.");
  }

  /** A blow of theirs that lands: a fist, or now and then a grapple. Fighting, every one of them. */
  private theirBlow(tag = ""): void {
    // Defensive Stance: their blows take less out of her, body and will, and can't pin her.
    const defensive = this.stance === "defensive";
    const hurt = (damage: number, will: number, event: string, text: string) => {
      // Target of Vulgar Gazes: every new one staring steadies her (Undone by Their Eyes: undoes her).
      const guard = Math.round(perTalker(this.starers.size, this.stats.lewdTalk?.guard ?? 0, SIGHT_GUARD_MAX));
      const n = Math.max(1, damage - (defensive ? DEFENSIVE.damage : 0) - guard);
      this.stamina = Math.max(0, this.stamina - n);
      this.will = Math.max(0, this.will - (defensive ? Math.floor(will / 2) : will));
      this.say(event, `${tag}${text} (-${n})`);
      this.gain("endurance", 1);
    };
    this.holding = false;
    // Butt desire: they'd rather get their hands on her than punch.
    if (this.random() >= FOE_GRAPPLE + this.penalties.grapple) {
      hurt(this.foeAttack, HIT_WILL, "their:hit", "They catch you one.");
      return;
    }
    const pick = pickGrapple(this.kind, this.random());
    const def = FOE_GRAPPLES[pick];
    this.grapplesTaken++;
    if (def.holds && !defensive) {
      this.held = true;
      this.timesHeld++;
    }
    // Thick Skin: their grapples hurt less.
    hurt(this.foeAttack + def.damage - (this.stats.grappleGuard ?? 0), HIT_WILL * def.will, `their:${pick}`, def.text);
    // A grapple: their hands wander while they have hold of her, to the part of her their type goes for.
    this.wander();
    // Consent off (KP's clothing damage): the grapple can tear the next piece off her.
    if (this.stats.forceful && this.nextPiece && this.random() < GRAPPLE_TEAR) {
      const piece = this.nextPiece;
      this.clothesAtReach = this.clothesOff;
      this.clothesOff++;
      this.torn++;
      this.say("their:stripped", withPiece(line(GRAPPLE_TEAR_LINES, this.textRoll(), this.name), piece));
      if (!this.nextPiece) this.say("bare", line(BARE_LINES, this.textRoll(), this.name));
      this.crowdSaysFrom(CROWD_STRIPPED_LINES);
      this.raiseFoe(FOE_PLEASURE.strip);
    }
  }

  /** Their hands wander in a grapple: her desire for the part their type goes for rises, and a little all over. */
  private wander(): void {
    if (!this.desire) return;
    const meter = METER_OF_AREA[this.foe.prefers ?? "hands"];
    const n = this.stir(meter, GRAPPLE_DESIRE);
    if (meter !== "body") this.stir("body", GRAPPLE_BODY);
    if (n > 0) this.say("their:wander", `Their hands wander while they have hold of you. (+${n} ${METER_NAMES[meter]} desire)`);
  }

  /**
   * She's answered their reach on the touch screen, and the fight picks up. A slap rocks them back; pulling away
   * gets her clear; a yes leaves them slow to get back to swinging. `will` is what she has left after answering.
   */
  afterReach(answer: "yes" | "slap" | "pull", will: number): void {
    if (!this.reaching) return;
    this.reaching = false;
    this.will = Math.max(0, Math.min(this.maxWill, will));
    this.actor = this.reacher;
    try {
      this.afterReachAs(answer);
    } finally {
      this.actor = this.target;
    }
  }

  private afterReachAs(answer: "yes" | "slap" | "pull"): void {
    if (answer === "slap") {
      // Stinging Reply: a slap mid-brawl hits harder.
      const sting = 2 + (this.stats.brawlSlap ?? 0);
      this.foeStamina = Math.max(0, this.foeStamina - sting);
      this.say("reach:slap", `Your slap rocks them back on their heels. (-${sting})`);
      if (this.foeStamina <= 0) this.knockout();
    } else if (answer === "pull") {
      this.say("reach:pull", "You twist clear and get your guard back up.");
    } else if (this.clothesOff > this.clothesAtReach) {
      // A piece of her clothes came off with it (7l).
      this.staggered = true;
      this.clothesCameOff();
    } else {
      this.staggered = true;
      this.say("reach:yes", "They're slow to get back to swinging.");
      this.raiseFoe(FOE_PLEASURE.touch);
    }
  }
}

function clamp01(n: number): number {
  return Math.min(0.95, Math.max(0.05, n));
}
