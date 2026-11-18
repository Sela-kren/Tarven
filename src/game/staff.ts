/**
 * Staff: the people who work for her (STAFF.md). Pure rules, kept apart from tavern.ts so they can be tested; the
 * tavern's hooks (a barmaid's side of the room, the cook's stew, the doorman's stool), the journal's Staff page and
 * the HUD's staff bar are still to come (STAFF.md §8).
 *
 * - **Who, and when** (§1, §5): no staff in the early game, she works alone. In the mid game she can hire a
 *   barmaid, a cook and a doorman, and the Lantern's girls come in once the lantern is hung. The late game opens
 *   the dancer, the devotee and the clerk, and a fuller house.
 * - **Their stats** (§3): the Lantern's girl stats, shared by every job, plus their own fame. Skill grows with
 *   use, the way hers does (skills.ts), and fame grows with good nights and a famous house.
 * - **A night, for each of them** (`nightFor`): stamina spent and rested, loyalty won or lost on pay and rest,
 *   corruption drifting toward the madam's exactly as the Lantern's does (STORY.md §12), and at loyalty 0 they
 *   quit. The dawn line says how they are: happy, steady, worn, resentful, or gone.
 * - **Their passives** (§3, late): a handful earned from their own records, like KP's for Karryn.
 * - **Their stories** (§5): each one's arc of 3 or 4 beats, each triggered by nights worked or loyalty, each with
 *   two or three ways it can go. The story cards themselves go in staffarcs.ts later; this is the table they read.
 *
 * Fixed and not negotiable (the consent rule, GAME_PATH.MD): every staff member is an adult (18+) who chose the
 * work. They're paid for it, they can refuse anything, and they can quit. The owner's choices are money, hours and
 * protection only, never their consent, the same as the Lantern's house rules.
 *
 * - **Recruitment** (STAFF.md, "Recruitment"): two ways in. She can post for work and take on one of a few random
 *   applicants (`rollApplicants`), each with a rarity (Common to Legendary) that decides their stats and whether
 *   they bring a perk; or she can hire the named people of the roster, who only work for a friend (`FRIEND_AT`),
 *   and who each bring a perk of their own (`FRIEND_PERK`).
 */
import type { Effects } from "./passives";
import { ARC_STAGES, ARC_TROPE, arcStageName, legendStep, mindStage, newLegend, readLegend, type ArcStage, type LegendState } from "./lewd";
import { fillCard, type Pusher, type StageCard, type StaffTierStep, type TropeId, type FallBeat } from "./tropes";

export type StaffJob = "barmaid" | "cook" | "doorman" | "girl" | "dancer" | "devotee" | "clerk";
export const STAFF_JOBS: readonly StaffJob[] = ["barmaid", "cook", "doorman", "girl", "dancer", "devotee", "clerk"];

/** The game's three acts, as far as staff are concerned (STAFF.md §1). */
export type Stage = "early" | "mid" | "late";
const STAGE_RANK: Record<Stage, number> = { early: 0, mid: 1, late: 2 };

/** When each job opens (STAFF.md §2). Nothing opens in the early game. */
export const JOB_UNLOCK: Readonly<Record<StaffJob, "mid" | "late">> = {
  barmaid: "mid",
  cook: "mid",
  doorman: "mid",
  girl: "mid",
  dancer: "late",
  devotee: "late",
  clerk: "late",
};

/** How many can be on the books at once, by stage: none early, the first few mid, a full house of 6 late. */
export const STAFF_CAP: Readonly<Record<Stage, number>> = { early: 0, mid: 3, late: 6 };

/** What each one has done in her house, all told: their passives and lewdness are worked out from these. */
export interface StaffRecords {
  /** Nights worked. */
  nights: number;
  /** Orders served (barmaid), bowls of stew (cook), lodgers seen to (clerk). */
  served: number;
  /** Bookings upstairs (girl). */
  bookings: number;
  /** Rough guests shown the door (doorman). */
  throwOuts: number;
  /** Dances on the bar (dancer). */
  dances: number;
  /** Tips, in gold. */
  tips: number;
  /**
   * Hands on them at work (`lewdWork`): a barmaid's bum pinched over the soldiers' table, coin in a dancer's garter,
   * a kiss for the doorman on the step, the cook pinched by the ovens. Older saves have none, so 0.
   */
  gropes: number;
  /** Revel nights worked in the Revel Hall (revel.ts): a whole night of it, whatever the job. Older saves: 0. */
  revels: number;
}

export interface StaffMember {
  id: string;
  name: string;
  age: number;
  job: StaffJob;
  female: boolean;
  /** How well they do the job, 0–10. */
  skill: number;
  /** How much guests want them, 0–10. */
  appeal: number;
  /** How happy guests leave, 0–10. */
  charm: number;
  /** Nights in a row they can work (current) before they need one off, out of max (0–10). */
  stamina: { current: number; max: number };
  /** Whether they stay, 0–100. At 0 they walk. */
  loyalty: number;
  /** How crooked they've become, 0–100: honest under 40, shady, crooked at 80, rotten at 95 (`STAFF_ROTTEN`). */
  corruption: number;
  /** How slowly their corruption drifts, 0–10. */
  resolve: number;
  /** Their own slut level, from their own nights (0 and up), on the heroine's stages. */
  lewdness: number;
  /** How well known they are on the pass, 0–100. Famous staff draw their own fans. */
  fame: number;
  /** Gold a night. */
  wage: number;
  /** The beat of their story reached (STAFF_ARCS): 0 before the first. */
  arcBeat: number;
  records: StaffRecords;
  /** The ids of the staff passives they've earned (STAFF_PASSIVES). */
  passives: string[];
  /** They've left her house. */
  quit: boolean;
  /** How rare a find they are (Common to Legendary), and their perks (STAFF_PERKS ids). */
  rarity: Rarity;
  perks: string[];
  /**
   * The furthest corruption tier (0 honest, 1 shady, 2 crooked, 3 rotten) and lewdness stage (0 sheltered to 3 known)
   * the dawn has told a story card for (CORRUPTION_TROPES.md): each step up gets one card, once.
   */
  tierSeen: number;
  stageSeen: number;
  /** Their Legend, the comic stage past Known (`staffStage`): older saves and new hires have never been one. */
  legend?: LegendState;
  /**
   * The post she's put them on (the plans' Staff tab): another job's, or "rest" to keep them off tonight. Missing
   * means their own job's.
   */
  post?: StaffJob | "rest";
}

/** One of the people who can be hired (STAFF.md §5): who they are, when they turn up, and how they start. */
export interface StaffDef {
  id: string;
  name: string;
  age: number;
  job: StaffJob;
  female: boolean;
  /** The act they turn up in, asking for work. */
  opens: "mid" | "late";
  /** Who they are, for the Staff page. */
  about: string;
  skill: number;
  appeal: number;
  charm: number;
  stamina: number;
  loyalty: number;
  corruption: number;
  resolve: number;
  wage: number;
  /** Their people (WORLD.md §7), and a line on their look for the art (POSES_TODO.md); the newer friends have both. */
  people?: string;
  look?: string;
}

/**
 * The roster: everyone who can ask her for work. Every one an adult. Tamsin's numbers are the Lantern's own
 * (lantern.ts, `tamsin`); a girl's wage is 0 because she's paid by the cut of each booking instead.
 */
export const STAFF_ROSTER: readonly StaffDef[] = [
  {
    id: "tamsin",
    name: "Tamsin",
    age: 26,
    job: "girl",
    female: true,
    opens: "mid",
    about: "Worked unpaid at the Velvet House and still owes Sabine. Came to you for a fair share. She knows the trade, and its tricks.",
    skill: 6,
    appeal: 6,
    charm: 6,
    stamina: 4,
    loyalty: 55,
    corruption: 45,
    resolve: 5,
    wage: 0,
  },
  {
    id: "maud",
    name: "Maud",
    age: 34,
    job: "barmaid",
    female: true,
    opens: "mid",
    about: "A farmer's widow saving to buy back the family farm from the Baron's tax man. Sends every coin home.",
    skill: 5,
    appeal: 4,
    charm: 6,
    stamina: 7,
    loyalty: 60,
    corruption: 10,
    resolve: 7,
    wage: 3,
  },
  {
    id: "corvin",
    name: "Corvin",
    age: 41,
    job: "cook",
    female: false,
    opens: "mid",
    about: "A good cook with a bad habit: he owes the smugglers for his dice, and they know where he works.",
    skill: 6,
    appeal: 2,
    charm: 3,
    stamina: 6,
    loyalty: 50,
    corruption: 30,
    resolve: 3,
    wage: 4,
  },
  {
    id: "ash",
    name: "Ash",
    age: 29,
    job: "doorman",
    female: false,
    opens: "mid",
    about: "Big, quiet, and good with his fists. Says he's from the coast. The garrison would call him a deserter.",
    skill: 6,
    appeal: 4,
    charm: 2,
    stamina: 8,
    loyalty: 45,
    corruption: 20,
    resolve: 6,
    wage: 4,
  },
  {
    id: "lysa",
    name: "Lysa",
    age: 20,
    job: "dancer",
    female: true,
    opens: "late",
    about: "Ran away from a lord's house to dance for coin. Her family wants her back, and they can pay to get her.",
    skill: 4,
    appeal: 8,
    charm: 6,
    stamina: 5,
    loyalty: 50,
    corruption: 5,
    resolve: 4,
    wage: 5,
  },
  {
    id: "wynn",
    name: "Brother Wynn",
    age: 38,
    job: "devotee",
    female: false,
    opens: "late",
    about: "Was Oden's man at the chapel, and is now half Veyra's. Leads a night service and can't decide whose.",
    skill: 5,
    appeal: 3,
    charm: 6,
    stamina: 5,
    loyalty: 40,
    corruption: 25,
    resolve: 5,
    wage: 3,
  },
  {
    id: "pip",
    name: "Pip",
    age: 23,
    job: "clerk",
    female: true,
    opens: "late",
    about: "Neat hands and a long memory. Writes everything down, other people's secrets included, and sells a few.",
    skill: 6,
    appeal: 4,
    charm: 5,
    stamina: 6,
    loyalty: 45,
    corruption: 40,
    resolve: 3,
    wage: 3,
  },
  {
    id: "sylvie",
    name: "Sylvie Ashleaf",
    age: 112,
    job: "cook",
    female: true,
    opens: "late",
    about: "An elf herbalist who left the Sylvaran courts for a kitchen. Brews tonics for the bar and won't say why she needed to leave.",
    skill: 6,
    appeal: 7,
    charm: 5,
    stamina: 5,
    loyalty: 50,
    corruption: 10,
    resolve: 7,
    wage: 5,
    people: "elf",
    look: "Tall and willowy, long pale-gold hair in a loose braid, pointed ears, a leaf-green apron over a modern linen shirt, sprigs of herbs at her belt.",
  },
  {
    id: "bru",
    name: "Brunhild Copperkeg",
    age: 46,
    job: "barmaid",
    female: true,
    opens: "mid",
    about: "A dwarf brewer with her own cask recipe and a grudge against every brewery in the Deephold that turned her down.",
    skill: 6,
    appeal: 5,
    charm: 6,
    stamina: 8,
    loyalty: 55,
    corruption: 20,
    resolve: 8,
    wage: 4,
    people: "dwarf",
    look: "Short and very broad, adult and strong, copper hair in two thick braids, freckles, rolled sleeves over brawny arms, a leather brewer's apron.",
  },
  {
    id: "grukka",
    name: "Grukka",
    age: 31,
    job: "doorman",
    female: true,
    opens: "mid",
    about: "An orc woman from the Khanate of Grask, done with selling her sword in the east. Blunt, loud, and very good at the door.",
    skill: 7,
    appeal: 5,
    charm: 3,
    stamina: 9,
    loyalty: 45,
    corruption: 30,
    resolve: 6,
    wage: 5,
    people: "orc",
    look: "Big and heavily muscled, grey-green skin, small tusks, a shaved side to her black hair, a sleeveless studded jerkin and a scar across one arm.",
  },
  {
    id: "mirri",
    name: "Mirri",
    age: 24,
    job: "dancer",
    female: true,
    opens: "late",
    about: "A cat-folk dancer from a Wildmarches river town. Proud, quick, and dancing her way across the kingdoms for coin.",
    skill: 6,
    appeal: 8,
    charm: 6,
    stamina: 6,
    loyalty: 45,
    corruption: 25,
    resolve: 4,
    wage: 5,
    people: "beastfolk (cat)",
    look: "Lithe, black cat ears and a long black tail, short dark bob, gold anklets and a cropped dancer's top with a wrap skirt.",
  },
  {
    id: "hikari",
    name: "Hikari",
    age: 22,
    job: "doorman",
    female: true,
    opens: "late",
    about: "A hero summoned from another kingdom for a war that ended without her. Broke, a long way from home, and still very good with a sword.",
    skill: 7,
    appeal: 7,
    charm: 5,
    stamina: 7,
    loyalty: 50,
    corruption: 5,
    resolve: 8,
    wage: 5,
    people: "human (summoned hero)",
    look: "Athletic, short silver-white hair, bright blue eyes, a battered hero's coat over a modern hoodie, a sword she can't afford to sharpen.",
  },
  {
    id: "edda",
    name: "Edda Thornwick",
    age: 39,
    job: "clerk",
    female: true,
    opens: "late",
    about: "A seamstress widowed by the war in the east. Keeps neat books, mends everything, and makes outfits that sell.",
    skill: 5,
    appeal: 6,
    charm: 6,
    stamina: 5,
    loyalty: 55,
    corruption: 15,
    resolve: 7,
    wage: 3,
    people: "human",
    look: "Soft and curvy, chestnut hair pinned up with needles, reading glasses on a chain, a black dress with a measuring tape round her neck.",
  },
  {
    id: "clara",
    name: "Clara Vane",
    age: 21,
    job: "barmaid",
    female: true,
    opens: "mid",
    about: "A lady's maid who ran from a noble house with nothing but her manners. Those manners are worth a lot behind a bar.",
    skill: 5,
    appeal: 7,
    charm: 7,
    stamina: 6,
    loyalty: 50,
    corruption: 10,
    resolve: 5,
    wage: 3,
    people: "human",
    look: "Petite and neat, strawberry-blonde hair in a tidy bun, a black maid's dress she's cut shorter, white cuffs and collar.",
  },
  {
    id: "snik",
    name: "Snik Brassvoice",
    age: 30,
    job: "dancer",
    female: false,
    opens: "late",
    about: "A goblin bard with a voice far bigger than he is and a phone full of songs. Plays for the room; everything's a deal.",
    skill: 6,
    appeal: 4,
    charm: 8,
    stamina: 6,
    loyalty: 45,
    corruption: 35,
    resolve: 4,
    wage: 4,
    people: "goblin",
    look: "Short and wiry but plainly grown, green skin, big ears with brass rings, a sharp grin and stubble, a patched waistcoat and a lute covered in stickers.",
  },
];

export const STAFF_BY_ID: Readonly<Record<string, StaffDef>> = Object.fromEntries(STAFF_ROSTER.map((d) => [d.id, d]));

/**
 * Who'll ask her for work at this stage: their job is open, they've turned up (their own act), they're not on
 * her books already, and she has room for one more (STAFF_CAP). Nobody in the early game.
 */
export function hireable(stage: Stage, hiredIds: readonly string[], friendship?: Readonly<Record<string, number>>): StaffDef[] {
  if (hiredIds.length >= STAFF_CAP[stage]) return [];
  return metAt(stage).filter((d) => !hiredIds.includes(d.id) && (!friendship || (friendship[d.id] ?? 0) >= FRIEND_AT));
}

/** The roster people she's met by this stage (their job is open and they've turned up), friends or not. */
export function metAt(stage: Stage): StaffDef[] {
  const rank = STAGE_RANK[stage];
  return STAFF_ROSTER.filter((d) => rank >= STAGE_RANK[JOB_UNLOCK[d.job]] && rank >= STAGE_RANK[d.opens]);
}

/** A new hire from the roster, rested and with clean records. */
export function hire(id: string): StaffMember {
  const d = STAFF_BY_ID[id];
  if (!d) throw new Error(`No one called ${id} on the staff roster`);
  return {
    id: d.id,
    name: d.name,
    age: d.age,
    job: d.job,
    female: d.female,
    skill: d.skill,
    appeal: d.appeal,
    charm: d.charm,
    stamina: { current: d.stamina, max: d.stamina },
    loyalty: d.loyalty,
    corruption: d.corruption,
    resolve: d.resolve,
    lewdness: 0,
    fame: 0,
    wage: d.wage,
    arcBeat: 0,
    records: { nights: 0, served: 0, bookings: 0, throwOuts: 0, dances: 0, tips: 0, gropes: 0, revels: 0 },
    passives: [],
    quit: false,
    rarity: FRIEND_RARITY[d.id] ?? "epic",
    perks: FRIEND_PERK[d.id] ? [FRIEND_PERK[d.id]] : [],
    tierSeen: STAFF_TIERS.indexOf(staffTier(d.corruption)),
    stageSeen: 0,
  };
}

// ---------- A night ----------

/** Corruption spreads, as at the Lantern (STORY.md §12, lantern.ts): a tenth of the gap a night... */
export const STAFF_DRIFT = 0.1;
/** ...slowed by resolve (at 10 it's half speed)... */
export const STAFF_RESOLVE_SLOWS = 0.05;
/** ...and half speed falling toward a cleaner madam. */
export const STAFF_FALL_SPEED = 0.5;
/** Each greedy house rule in force pushes it up this much more. */
export const STAFF_GREEDY_PUSH = 3;

/** Loyalty on pay, by what she paid against their wage: generous (1.5× or more), fair, short, or next to nothing. */
export const PAY_LOYALTY = { generous: 3, fair: 1, short: -3, unpaid: -6 } as const;
/** Each greedy rule in force on a night they work wears it down a little more. */
export const GREEDY_LOYALTY = -1;
/** Worked with no stamina left: they're worn, and it costs loyalty. */
export const TIRED_LOYALTY = -2;
/** A night off restores their stamina and wins a little loyalty. */
export const REST_LOYALTY = 1;
/** Honest staff under a crooked madam (80 and up) lose heart each night they work. */
export const CROOKED_MADAM = 80;
export const HONEST_UNDER_CROOK = -3;
/** Skill rises 1 every this many nights worked, to 10. */
export const SKILL_NIGHTS = 10;
/** A famous house lifts its staff: 1 fame a night while the house is this much more famous than they are. */
export const HOUSE_LIFT_GAP = 20;
/** Loyalty from which they're happy, and under which they're resentful. */
export const HAPPY_LOYALTY = 70;
export const RESENTFUL_LOYALTY = 25;

export type StaffMood = "happy" | "steady" | "worn" | "resentful" | "quit";

export interface StaffNight {
  /** They worked tonight (otherwise it was a night off). */
  worked: boolean;
  /** Gold she paid them tonight. */
  wagePaid: number;
  /** The house's fame, and the madam's corruption, which they drift toward. */
  houseFame: number;
  madamCorruption: number;
  /** How many of the house rules are greedy (the Lantern's four, or the staff's own when they come). */
  greedyRules: number;
  /** What they did tonight, added to their records. */
  done?: Partial<Omit<StaffRecords, "nights">>;
}

export interface StaffDawn {
  mood: StaffMood;
  /** What changed overnight. */
  loyalty: number;
  fame: number;
  corruption: number;
  skill: number;
  /** Passives earned tonight (their ids), and the story beat now due, if one is. */
  passives: string[];
  beat: ArcBeat | null;
  line: string;
  /** The story cards of a step up tonight (a corruption tier, a lewdness stage), their lines filled in for them. */
  cards: StageCard[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** One night's drift of their corruption toward the madam's: the Lantern's rule exactly (lantern.ts, `drift`). */
export function staffDrift(own: number, madam: number, resolve: number): number {
  const gap = madam - own;
  const step = gap * STAFF_DRIFT * (1 - STAFF_RESOLVE_SLOWS * clamp(resolve, 0, 10)) * (gap < 0 ? STAFF_FALL_SPEED : 1);
  return Math.max(0, own + step);
}

/**
 * Rotten, for staff: 95 and up. Their corruption stops at 100 and closes on the madam's a tenth of the gap a night,
 * so they only get this far under a madam past 95 (well into her crooked, 80 to 149, or rotten herself), or with
 * greedy house rules pushing 3 a night each on top. Under a madam of 120 a crooked barmaid of resolve 5 gets there
 * in about a week; under a madam of 80 with no greedy rules, never.
 */
export const STAFF_ROTTEN = 95;

/** Their tier, on the madam's scale (rotten comes sooner on theirs: see `STAFF_ROTTEN`). */
export function staffTier(corruption: number): "honest" | "shady" | "crooked" | "rotten" {
  if (corruption >= STAFF_ROTTEN) return "rotten";
  if (corruption >= 80) return "crooked";
  if (corruption >= 40) return "shady";
  return "honest";
}

/** Gropes that make a point of lewdness (as 3 bookings do), and what one revel night worked is worth. */
export const GROPES_PER_LEWD = 3;
export const REVEL_LEWD = 1;

/**
 * Their lewdness, from their own records: 1 for every 3 bookings and 1 for every 5 dances (as the Lantern counts),
 * 1 for every 3 times a guest got hands on them at work, and 1 for every revel night they worked.
 */
export function staffLewdness(records: StaffRecords): number {
  return (
    Math.floor(records.bookings / 3) +
    Math.floor(records.dances / 5) +
    Math.floor((records.gropes ?? 0) / GROPES_PER_LEWD) +
    REVEL_LEWD * (records.revels ?? 0)
  );
}

/** What the tavern saw of the night, for what each job's work did to them (`lewdWork`). */
export interface LewdNightFacts {
  /** Hands that reached for the keeper tonight (tavern.ts `touchesTonight`): how handsy the room was. */
  reached: number;
  /** Tonight was a revel night, and the revel was held. */
  revel: boolean;
}

/**
 * Each job's lewd work a night, so each of them falls at their own pace: the gropes every night on, one more for
 * every `perReach` hands that reached for the keeper (a handsy room is handsy with everyone; 0, none), and dances.
 * In a handsy room (4 hands for her) that's about a point of lewdness a night for a barmaid, a bit more for a
 * dancer, most for a girl working the floor, a point every three nights for the doorman and the devotee, and next
 * to nothing for the cook and the clerk, who are only pinched when the room's wild (6 hands or more). A Lantern
 * girl on 2 bookings a night makes about two thirds of a point, more when she enjoys them (STORY.md §12).
 */
export const JOB_LEWD_WORK: Readonly<Record<StaffJob, { gropes: number; perReach: number; dances: number }>> = {
  barmaid: { gropes: 1, perReach: 2, dances: 0 },
  girl: { gropes: 3, perReach: 2, dances: 0 },
  dancer: { gropes: 1, perReach: 4, dances: 3 },
  doorman: { gropes: 0, perReach: 3, dances: 0 },
  devotee: { gropes: 1, perReach: 0, dances: 0 },
  cook: { gropes: 0, perReach: 6, dances: 0 },
  clerk: { gropes: 0, perReach: 6, dances: 0 },
};

/** A revel night: the dancer dances this many more, and everyone on works the hall (a revel to their records). */
export const REVEL_DANCES = 2;

/**
 * What one night's work did to one of them, for their records (the tavern adds it to `StaffNight.done` for anyone
 * who worked). It's only what the job brought: a girl's bookings are the Lantern's to count, and nobody's made to.
 */
export function lewdWork(job: StaffJob, facts: LewdNightFacts): Pick<StaffRecords, "gropes" | "dances" | "revels"> {
  const w = JOB_LEWD_WORK[job];
  const reached = Math.max(0, Math.floor(facts.reached));
  return {
    gropes: w.gropes + (w.perReach > 0 ? Math.floor(reached / w.perReach) : 0),
    dances: w.dances + (facts.revel && job === "dancer" ? REVEL_DANCES : 0),
    revels: facts.revel ? 1 : 0,
  };
}

// ---------- Their stages and story cards (CORRUPTION_TROPES.md) ----------

/** Their tiers, in order (they top out at rotten, 95 to 100: their corruption is 0 to 100). */
export const STAFF_TIERS = ["honest", "shady", "crooked", "rotten"] as const;

/**
 * Their lewdness on the heroine's four stages, by her thresholds (lewd.ts `MIND_AT`), as the Lantern reads its
 * girls' (lantern.ts `stageOf`): sheltered, curious, willing, known. Known needs only the filthy mind stage here.
 * Past Known is Legend, while they hold it (`legendStep` in `nightFor`).
 */
export function staffStage(member: Pick<StaffMember, "lewdness" | "legend">): ArcStage {
  const mind = mindStage(member.lewdness);
  return mind === 3 && member.legend?.on ? "legend" : ARC_STAGES[mind];
}

/**
 * Their Legend (the heroine's, lewd.ts `legendStep`, on their own numbers): lewdness STAFF_LEGEND_AT and Known,
 * then STAFF_LEGEND_RISE nights worked in a row; STAFF_LEGEND_FALL nights off in a row bring them back to Known.
 */
export const STAFF_LEGEND_AT = 140;
export const STAFF_LEGEND_RISE = 4;
export const STAFF_LEGEND_FALL = 2;

/** One night of their Legend: worked is the wild side, a night off the quiet one. */
export function staffLegendStep(legend: LegendState | undefined, lewdness: number, worked: boolean): { state: LegendState; change: "rise" | "fall" | null } {
  const eligible = mindStage(lewdness) === 3 && lewdness >= STAFF_LEGEND_AT;
  return legendStep(legend ?? newLegend(), { eligible, wild: worked, quiet: !worked }, STAFF_LEGEND_RISE, STAFF_LEGEND_FALL);
}

/**
 * Who's pushing their corruption (CORRUPTION_TROPES.md, "Staff"): Tamsin still owes Sabine, Corvin owes the
 * smugglers, and the church has Brother Wynn and every devotee. Everyone else, it's the madam: her.
 */
export const STAFF_PUSHER: Readonly<Record<string, Pusher>> = { tamsin: "sabine", corvin: "smugglers", wynn: "church" };

export function pusherOf(member: Pick<StaffMember, "id" | "job">): Pusher {
  return STAFF_PUSHER[member.id] ?? (member.job === "devotee" ? "church" : "madam");
}

/**
 * The trope of each tier step, by who's pushing: the madam conditions, then isolates; Sabine love-bombs, then goes
 * cold (devaluation); the church rationalises, then brainwashes; the smugglers blackmail all the way down. Shady
 * is where they start to own it (internalisation), crooked is the break, and rotten is the aftermath, on the
 * heroine's own Rotten tropes (gaslighting, trauma bond, brainwashing): they've learned the house's tricks, and now
 * they play them on her.
 */
export const STAFF_TIER_TROPE: Readonly<Record<Pusher, Readonly<Record<StaffTierStep, { trope: TropeId; also?: TropeId; beat: FallBeat }>>>> = {
  madam: {
    shady: { trope: "conditioning", beat: "internalisation" },
    crooked: { trope: "isolation", also: "conditioning", beat: "break" },
    rotten: { trope: "traumaBond", also: "gaslighting", beat: "aftermath" },
  },
  sabine: {
    shady: { trope: "loveBombing", beat: "internalisation" },
    crooked: { trope: "loveBombing", also: "isolation", beat: "break" },
    rotten: { trope: "traumaBond", also: "gaslighting", beat: "aftermath" },
  },
  church: {
    shady: { trope: "rationalisation", beat: "internalisation" },
    crooked: { trope: "brainwashing", also: "rationalisation", beat: "break" },
    rotten: { trope: "brainwashing", also: "gaslighting", beat: "aftermath" },
  },
  smugglers: {
    shady: { trope: "blackmail", beat: "internalisation" },
    crooked: { trope: "blackmail", also: "rationalisation", beat: "break" },
    rotten: { trope: "gaslighting", also: "traumaBond", beat: "aftermath" },
  },
};

const PUSHER_WHO: Readonly<Record<Pusher, string>> = { madam: "the madam", sabine: "Sabine", church: "the church", smugglers: "the smugglers" };

/**
 * The tier cards' lines ({name}, {they} and the rest filled in by `fillCard`). The last line is always theirs:
 * staff choose their work whatever the switch (GAME_PATH.MD), and they can say no and walk.
 */
export const STAFF_TIER_LINES: Readonly<Record<Pusher, Readonly<Record<StaffTierStep, { title: string; lines: readonly string[] }>>>> = {
  madam: {
    shady: {
      title: "A bit more",
      lines: [
        "Every time {name} did \"a bit more\" with the soldiers' table, you slid an extra copper across the bar. Last night {name} did a bit more before you'd even reached for the copper.",
        "(You've trained dogs slower. Better-behaved dogs, mind.)",
        "Nobody made {them}. {They} could have kept it honest and kept the wage. {They} pocketed the copper.",
      ],
    },
    crooked: {
      title: "This house is my family",
      lines: [
        "A letter came for {name} from home. {name} burned it at the hearth without opening it, said \"this house is my family now\", and lifted a drunk drover's purse on the way back to the bar.",
        "(Nobody else will have {them} now. That's not my fault. It's a little bit my fault.)",
        "{name} chose it. {They} could walk out the door tonight, and won't.",
      ],
    },
    rotten: {
      title: "You said I could",
      lines: [
        "The good candlesticks have been going home with {name}, one a night. When you asked, {name} looked wounded: \"You said I could. Tuesday. You were wiping the bar.\" Then {they} sold your stew recipe to the Copper Bell for a silver, and cried on your shoulder about it until you said sorry. You said sorry.",
        "(I taught {them} every trick {they} knows, and {they} learned them all. I'm the trouble and the hanky, and {they}'d never leave either. I'm almost proud. I'm counting the spoons.)",
        "{name} chose this house, and could walk out of it any night. {They} won't. {They}'d miss you. And the candlesticks.",
      ],
    },
  },
  sabine: {
    shady: {
      title: "Flowers from the Velvet House",
      lines: [
        "Sabine sent {name} roses, a bottle of the Velvet House red and a note: \"Wasted on a tavern, darling. You're art.\" {name} has read it nine times, and now sells the house red like a courtesan sells a night.",
        "(Sabine's charming {them} one compliment at a time. I know that trick. I use that trick.)",
        "{name} could bin the roses. {They} put them on the bar instead.",
      ],
    },
    crooked: {
      title: "The note that didn't come",
      lines: [
        "Sabine's stopped writing. {name} checks for a message from her between every order, and meanwhile has started skimming the till \"to show her what I'm worth\".",
        "(First the flowers, then nothing. Sabine does it to all of them, and it works on all of them. It's working on {them} now.)",
        "It's {their} choice, and {name} can still tell Sabine no. {They} just keep checking for that message.",
      ],
    },
    rotten: {
      title: "Sabine's little bird",
      lines: [
        "Sabine finally wrote back, one line: \"I knew you'd come home to me.\" {name} has sung ever since, at the till, in the cellar, and at the Velvet House's back door, where {they} sold Sabine your guest list, your prices and the name of the soldier who cries after.",
        "(\"She's horrible to me,\" {name} sighed, happily. I mentioned the guest list. \"What list? You never kept a list, darling. You're tired.\" That's Sabine's line. {They} even did her voice.)",
        "{name} can tell Sabine no and mean it, any night {they} likes. {name} hasn't liked it yet.",
      ],
    },
  },
  church: {
    shady: {
      title: "What you need",
      lines: [
        "{name} came back from the midnight service glowing. \"Veyra only asks what you need,\" {name} told the kitchen, and charged a pilgrim double for the stew. \"He needed the lesson.\"",
        "(Veyra's very good at telling people what they need. Mostly it's to give Veyra money.)",
        "Nobody's making {them}. {name} can stop going to the services any night.",
      ],
    },
    crooked: {
      title: "The candle before the shift",
      lines: [
        "{name} lights Veyra's candle before every shift now, and sells the deacons the names of whoever confesses into their ale at the bar. \"It's for their own good,\" says {name}, smiling like a painted saint.",
        "(That smile hasn't moved in three days. I'm not sure it's {name}'s any more.)",
        "{name} chose the church, and the chapel's door is still open any time.",
      ],
    },
    rotten: {
      title: "Veyra's bookkeeping",
      lines: [
        "{name} tithes the till now. Not the profit: the till. \"Veyra asked,\" {name} says serenely, and the deacons' new roof is lovely. When you count the takings, {name} counts them again, slower, until you agree there was less than you thought. {They} also put a laxative in the Copper Bell keeper's ale \"to purge the unbeliever\". He was purged. In the street. Twice.",
        "(The church took {name} apart and put {them} back together facing the chapel. The new one hums hymns while robbing me, and I've started humming along.)",
        "{name} chose Veyra, and the chapel's door out is still open. {They} could walk through it any night, humming.",
      ],
    },
  },
  smugglers: {
    shady: {
      title: "A cask that fell off a cart",
      lines: [
        "The smugglers came round for {name}'s dice money again and took a favour instead: a cask that \"fell off\" the cart, into your cellar, no questions. {name} looked sick about it for an hour, then asked them for a cut.",
        "(They've got {them} by the dice, and now by the cask. Next it'll be by the balls.)",
        "{name} could have told them no and taken the beating. {They} took the cut.",
      ],
    },
    crooked: {
      title: "Working for them",
      lines: [
        "{name} doesn't owe the smugglers any more. {name} works for them: their casks, their prices, their whispers at your back door after close. \"They own a bit of me. The best bit, says the money.\"",
        "(I could have helped pay that debt off a month ago. I didn't. Now they've got someone in my kitchen, and so have I.)",
        "{name} chose it, and could still walk away from them. {They} haven't.",
      ],
    },
    rotten: {
      title: "There were always fifteen",
      lines: [
        "The smugglers broke {name}'s little finger over a short count, then bought {them} a pie, and {name} calls them family now. Family runs its casks through your cellar on your nights off. You counted twelve barrels. \"There were always fifteen,\" says {name}. \"You're thinking of last month.\"",
        "(I've counted three times. It's twelve. I think it's twelve. {name}'s very convincing for someone holding a pie.)",
        "{name} could walk away from them any night, with all ten fingers. {They} went back for another pie.",
      ],
    },
  },
};

/** A corruption tier card for one of them, filled in: tagged with the trope of who's pushing. */
export function staffTierCard(member: Pick<StaffMember, "id" | "job" | "name" | "female">, step: StaffTierStep): StageCard {
  const pusher = pusherOf(member);
  const t = STAFF_TIER_TROPE[pusher][step];
  const text = STAFF_TIER_LINES[pusher][step];
  return {
    id: `staff_${pusher}_${step}`,
    ...t,
    who: PUSHER_WHO[pusher],
    title: text.title,
    lines: text.lines.map((l) => fillCard(l, member.name, member.female)),
  };
}

/**
 * Each roster person's own line at each of the four stages, in their voice. Their lewdness (`staffLewdness`) rises
 * with their own job's work (`lewdWork`), so the barmaid and the dancer get here long before the cook does.
 */
export const STAFF_STAGE_LINES: Readonly<Record<string, Readonly<Record<ArcStage, string>>>> = {
  tamsin: {
    sheltered: "Sabine had me smiling for free for two years. Here I smile for a share. It's a different smile.",
    curious: "Had a soldier last night who said please and thank you. I nearly fell off the bed. I'll ask for him again.",
    willing: "Put me down for the garrison's payday. All of them. I've been stretched for worse and paid less.",
    known: "Half the pass has had me and the other half's saving up. Tell Sabine that. Tell her slowly.",
    legend: "Sabine sent a girl to spy on my bookings. She ended up booking me. Twice. Then she asked for a job.",
  },
  maud: {
    sheltered: "Hands where I can see them, lads. I've buried one husband and I'm not scared of a second.",
    curious: "A drover pinched my bum and tipped me a silver for it. That's a quarter of a goat. Pinch away.",
    willing: "I let the cattle men have a feel of my tits for the farm fund. The farm doesn't care where the coin's been. Nor do I, now.",
    known: "They call me the Widow's Udders down the market. I bought back the top field with them. Moo.",
    legend: "The cattle market stopped the auction to sing my song. The Widow's Udders, verse four. I joined in on the moo.",
  },
  corvin: {
    sheltered: "Out of my kitchen unless you're the stew. Or paying.",
    curious: "The new barmaid licked gravy off my thumb. On purpose. I burned the onions.",
    willing: "I'll bring the stew out with my shirt off if it gets a tip. It's hot back there, and I owe a lot of dice money.",
    known: "Half the ladies who come for the stew come for the cook. I had a merchant's wife on the flour sacks. The bread's never been better.",
    legend: "They chant \"COOK! COOK!\" when I bring the stew out in the apron. Just the apron. From the back it's all cook.",
  },
  ash: {
    sheltered: "I stand at the door. I don't talk. I definitely don't do whatever that lot are doing.",
    curious: "A smuggler's lass kissed me on the way out. I let her. I keep thinking about it on the stool.",
    willing: "I walk the drunk girls home. Sometimes they ask me in. Sometimes I go in.",
    known: "The garrison wants the deserter back. The ladies of the pass want the big quiet one off the door. The ladies are winning.",
    legend: "The garrison sent a sergeant to drag me back. He's in the queue now. I've given him a number.",
  },
  lysa: {
    sheltered: "I dance. Nobody touches. My father's guards taught me how to bite.",
    curious: "I let the soldiers stuff coin in my garter, and their fingers stayed a while. I didn't kick them. Mother would faint.",
    willing: "Top comes off after the second song, the rest after the third. My family wrote to disown me. I danced on the letter.",
    known: "A lord's daughter, naked on a tavern bar and as rich as her father. They want me back? They can buy a ticket.",
    legend: "My father came up the pass to drag me home and ended up in the front row. He tipped. We don't talk about it. The whole pass does.",
  },
  wynn: {
    sheltered: "Oden's prayers at dusk, Veyra's at midnight. Neither of them mentions... that. I checked.",
    curious: "A pilgrim girl asked me to bless her. All of her. I said a very long prayer with my eyes shut. Mostly shut.",
    willing: "Veyra says the flesh is a gift. I've been unwrapping a lot of gifts in the vestry.",
    known: "Standing room only at the midnight service. Half come for the sermon, half for what comes after. Veyra's delighted. Oden's stopped speaking to me.",
    legend: "I preach the midnight sermon naked now. Veyra says it's honest. Oden says it's Tuesday. Attendance has tripled.",
  },
  pip: {
    sheltered: "I write down what people do upstairs. I don't do it. It's purely professional.",
    curious: "I watched through the keyhole for the ledger. For accuracy. I needed a sit down after.",
    willing: "The rich ones pay extra to be written down. I let them watch me write it, sat on the desk with my stockings rolled.",
    known: "I keep a column for everyone who's had me. It's the longest column in the book. I'm very thorough.",
    legend: "I've started a second ledger just for the people who've had me. It has an index. It's getting a sequel.",
  },
  sylvie: {
    sheltered: "Courtly elves don't touch in public. Or in private, mostly. It's terribly dull.",
    curious: "I brewed a stamina tonic and tested it on myself. Then on a soldier. For science. Twice.",
    willing: "My tonics sell better served in my smallclothes. The court would die. I've never been happier.",
    known: "Three hundred years of manners, and I've unlearned every one in this kitchen. The lodgers say I scream like a banshee. Fair.",
    legend: "The elven court sent an envoy to shame me. I sold her a tonic and she screamed the inn down. Now there are two of us.",
  },
  bru: {
    sheltered: "Touch my cask and lose a hand. Touch me and lose both.",
    curious: "A tall lad lifted me onto the bar to see the taps better, and didn't put me down for a while. Didn't mind.",
    willing: "Buy the house a round of Copperkeg and I'll sit on your lap for it. Two rounds and I'll bounce.",
    known: "Every brewery in the Deephold that turned me down has heard of me now. Not for the beer.",
    legend: "They carry me round the taproom on a shield while I drink. I'm not sure what we're celebrating. It's me. We're celebrating me.",
  },
  grukka: {
    sheltered: "Grukka throws out men who grab. Grukka has thrown out three today. It is not yet dark.",
    curious: "A soldier grabbed, and Grukka did not throw him. Grukka is confused. Grukka liked it.",
    willing: "Grukka takes the brave ones round the back after close. Grukka is gentle. Mostly. They limp home happy.",
    known: "In Grask they sing of battles. On the pass they sing of Grukka's thighs. Grukka prefers the pass.",
    legend: "Grukka is a song now. Grukka is three songs. One is just Grukka's name, very loud, then moaning. Grukka wrote that one.",
  },
  mirri: {
    sheltered: "You may look. You may not touch. I have claws, and a very good lawyer.",
    curious: "Someone scratched behind my ears during the third dance and I purred. In front of everyone. I need a drink.",
    willing: "Ears, tail, everything else: scratch where you like, and the coin goes in the garter. Not the tail. Fine, the tail.",
    known: "I'm in heat every night of the week, darling. It's called a career. Form a queue.",
    legend: "They hold my tail and chant my name and I purr loud enough to rattle the windows. I'm not in heat, darling. I'm on tour.",
  },
  hikari: {
    sheltered: "I was summoned to fight a demon lord, not to get my arse pinched by a turnip farmer.",
    curious: "The bard wrote a song about my thighs. I pretended to hate it. I hummed it all night.",
    willing: "Where I come from this is a whole genre. Fine. I'll be the heroine who never leaves the inn.",
    known: "Hero of a war that ended without me, and now hero of the back room. The bards say it's a better story.",
    legend: "A new summoned hero turned up begging me to save the world. I said after close. He's still here. He's very saved.",
  },
  edda: {
    sheltered: "I'm a widow. I mend, I keep the books, and I'm in bed alone by nine.",
    curious: "A traveller asked me to measure his inside leg. I measured it twice. It was a very long leg.",
    willing: "I make the outfits, so I model them. Fitted on, for the gentlemen paying for the fitting.",
    known: "My husband would be shocked, then he'd want a turn. Half the road's been through my sewing room, and I've mended all their trousers after.",
    legend: "I've stopped mending trousers. Half the pass comes in without them now, to save me the bother. Very considerate.",
  },
  clara: {
    sheltered: "A lady's maid keeps her eyes down and her knees together, sir. Your ale.",
    curious: "A gentleman tipped me for curtseying deeper. I curtseyed deeper. He tipped again. I see how this works now.",
    willing: "I served the nobles' table on my knees tonight. Manners, sir, are knowing what a guest needs.",
    known: "My old lady rang for her maid. Now the whole pass rings for me, and I always come. Ha.",
    legend: "They ring the bell, I curtsey, and the whole taproom shouts \"DEEPER!\" I always go deeper. Manners.",
  },
  snik: {
    sheltered: "I sing about other people's sex lives. Mine's a short song. A short, sad song.",
    curious: "A big lass asked for a private song. Turned out she wanted the bard. I wrote three verses about it.",
    willing: "Everything's a deal, love. A song for a kiss, a ballad for a blowie, and the epic... you'll want a room.",
    known: "I've had more of the pass than the toll road has. Wrote it all down, set it to music, and it's top of my phone.",
    legend: "My song about me is top of every phone on the pass. The chorus is just my name and a noise. The noise is me.",
  },
};

/** For applicants, a line by their job at each stage. */
export const JOB_STAGE_LINES: Readonly<Record<StaffJob, Readonly<Record<ArcStage, string>>>> = {
  barmaid: {
    sheltered: "Two ales, a stew, and no hands, thank you.",
    curious: "A soldier tipped me for leaning over the table. I lean over a lot now.",
    willing: "Feel what you like, love. The till's right there.",
    known: "They come for the ale and stay for my tits. The ale's not that good.",
    legend: "They chant my name when I bend for the bottom shelf. I keep all the good stuff on the bottom shelf now.",
  },
  cook: {
    sheltered: "Kitchen's mine. Out.",
    curious: "Someone pinched me by the ovens and I didn't throw the ladle. Strange night.",
    willing: "I'll bring the stew round myself, apron and nothing under it, for a silver.",
    known: "Everyone in town's had a taste of the cook. The stew comes a close second.",
    legend: "The kitchen's got a queue and a chant. They're not here for the gravy. Well. Some gravy.",
  },
  doorman: {
    sheltered: "Name, coin, and hands to yourself.",
    curious: "Got kissed on the doorstep last night. Let them in for free. Don't tell her.",
    willing: "I walk the lonely ones home. Some nights I don't walk back till morning.",
    known: "Half the queue at the door isn't for the tavern. It's for me.",
    legend: "They cheer when I pat them down at the door. Some go back out just to get patted down again.",
  },
  girl: {
    sheltered: "Plain bookings. Gentle ones. I'm still learning.",
    curious: "I took a soldier up tonight and enjoyed it. I wasn't meant to enjoy it, was I?",
    willing: "The rough ones pay double. Send me the rough ones.",
    known: "I'm the one they climb the stairs for. Every night. All night.",
    legend: "They sing on the stairs while they wait for me. In harmony now. I taught them the harmony.",
  },
  dancer: {
    sheltered: "I dance. Look all you like. That's the job.",
    curious: "My strap slipped and the room roared. I let it stay slipped.",
    willing: "Second song, the top goes. Third, the rest. Fourth, someone's lap.",
    known: "They've named a dance after me on the pass. You do it with no clothes and a lot of knees.",
    legend: "Halfway through the first song they're chanting for the third. I skip straight to the third. Everyone wins.",
  },
  devotee: {
    sheltered: "The service is for prayer. Only prayer.",
    curious: "A worshipper kissed my hand during the rite, then my wrist. I let the rite run long.",
    willing: "Veyra blesses the flesh. I bless it for her, personally.",
    known: "The midnight rite's the busiest thing in Tarven. Nobody leaves unblessed. Or dressed.",
    legend: "The midnight rite has a chant now, and it's my name. Veyra's a little jealous. Veyra can wait her turn.",
  },
  clerk: {
    sheltered: "Rooms, keys and the ledger. Nothing else.",
    curious: "A lodger asked if I deliver. I delivered. I'm still blushing.",
    willing: "Room four's on the house, if I come with it.",
    known: "The ledger says I've stayed in every room. It's not wrong.",
    legend: "Every room on the ledger has my name in it, and a little star. Room four has three stars and a song.",
  },
};

/** Their own line at the stage they're at: their own if they're on the roster, else their job's. */
export function staffStageLine(member: Pick<StaffMember, "id" | "job" | "lewdness" | "legend">): string {
  return (STAFF_STAGE_LINES[member.id] ?? JOB_STAGE_LINES[member.job])[staffStage(member)];
}

/**
 * The hook for their look at each stage (no art yet): an outfit key the wardrobe can map per person or job, from
 * their plain work clothes to the house favourite's. As with the heroine, each stage shows a little more.
 */
export const STAFF_STAGE_LOOK: Readonly<Record<ArcStage, string>> = {
  sheltered: "work",
  curious: "work_loosened",
  willing: "work_showing",
  known: "house_favourite",
  legend: "house_legend",
};

/** Their look now: the outfit key, as `<id>/<outfit>` (the art can fall back to `<job>/<outfit>`, then the outfit). */
export function staffLook(member: Pick<StaffMember, "id" | "job" | "lewdness" | "legend">): { stage: ArcStage; outfit: string; key: string; jobKey: string } {
  const stage = staffStage(member);
  const outfit = STAFF_STAGE_LOOK[stage];
  return { stage, outfit, key: `${member.id}/${outfit}`, jobKey: `${member.job}/${outfit}` };
}

/** What changes on the step up to each stage, for anyone (the person's own line follows it). */
const STAGE_CARD_LINES: Readonly<Record<Exclude<ArcStage, "sheltered">, string>> = {
  curious: "{name} has noticed the tips come bigger when the hand isn't slapped away, and has stopped slapping.",
  willing: "\"I'd only be lying if I said I didn't want it,\" {name} tells the kitchen. Nobody argues.",
  known: "Guests ask for {name} by name now, and the respectable ones have stopped saying good morning to {them} in the street. {They} hardly notice.",
  legend: "The whole taproom chants {name}'s name on {their} way through, and {name} takes a bow every time, with nothing on to bow in. Shame has left the building. Nobody's sure it ever worked here.",
};

/**
 * A lewdness stage card for one of them: the heroine's trope for that step (lewd.ts `ARC_TROPE`), what changed,
 * their own new line, and that it was their choice (staff choose their work and can refuse anyone).
 */
export function staffStageCard(member: Pick<StaffMember, "id" | "job" | "name" | "female">, stage: Exclude<ArcStage, "sheltered">): StageCard {
  const t = ARC_TROPE[stage];
  const fill = (l: string) => fillCard(l, member.name, member.female);
  const own = (STAFF_STAGE_LINES[member.id] ?? JOB_STAGE_LINES[member.job])[stage];
  return {
    id: `staff_stage_${stage}`,
    ...t,
    title: `${member.name}: ${arcStageName(stage)}`,
    lines: [
      fill(STAGE_CARD_LINES[stage]),
      `${member.name}, ${arcStageName(stage)}: "${own}"`,
      fill("{name} chose every bit of it, and can still say no to anyone. It just comes out less often."),
    ],
  };
}

/** Back from Legend to Known, after their nights off: the chant fades, and they're still their own. */
export function staffLegendBackCard(member: Pick<StaffMember, "id" | "job" | "name" | "female">): StageCard {
  const fill = (l: string) => fillCard(l, member.name, member.female);
  return {
    id: "staff_legend_back",
    trope: "mindBreak",
    also: "conditioning",
    beat: "aftermath",
    who: "nights off",
    title: `${member.name}: nights off`,
    lines: [
      fill("Two nights off in a row, and the chant for {name} has dropped to a hopeful hum. The regulars keep looking at the door, and one of them has written {name} a poem. It's filthy. It's quite good."),
      fill("{name} is Known again: still the talk of the pass, and back to remembering it's {their} own choice."),
      fill("{name} chose every bit of it, and can still say no to anyone. A few nights off proved it."),
    ],
  };
}

/** What tonight's pay does to loyalty: a wage of 0 (a girl on the cut) never counts as short. */
export function payLoyalty(wage: number, paid: number): number {
  if (wage <= 0) return 0;
  const ratio = paid / wage;
  if (ratio >= 1.5) return PAY_LOYALTY.generous;
  if (ratio >= 1) return PAY_LOYALTY.fair;
  if (ratio >= 0.5) return PAY_LOYALTY.short;
  return PAY_LOYALTY.unpaid;
}

const MOOD_TEXT: Record<StaffMood, string> = {
  happy: "is happy here",
  steady: "is steady",
  worn: "is worn out",
  resentful: "is resentful",
  quit: "has quit",
};

/**
 * One night, for one of them: returns them as they are by dawn (a copy; the one passed in isn't changed) and the
 * dawn summary. A night worked spends a point of stamina, is paid (or not), drifts their corruption toward the
 * madam's with 3 more per greedy rule, wears loyalty down a little per greedy rule, and counts toward their skill
 * and records. A night off restores their stamina in full. A good night worked (paid fair, not worked tired) earns
 * a point of fame, and a much more famous house lifts them a point more. At loyalty 0 they quit.
 */
export function nightFor(member: StaffMember, night: StaffNight): { member: StaffMember; dawn: StaffDawn } {
  const m: StaffMember = {
    ...member,
    stamina: { ...member.stamina },
    records: { ...member.records },
    passives: [...member.passives],
  };
  if (m.quit) {
    return { member: m, dawn: { mood: "quit", loyalty: 0, fame: 0, corruption: 0, skill: 0, passives: [], beat: null, line: `${m.name} is gone.`, cards: [] } };
  }
  const before = { loyalty: m.loyalty, fame: m.fame, corruption: m.corruption, skill: m.skill };
  let tired = false;
  let pay = 0;
  if (night.worked) {
    tired = m.stamina.current <= 0;
    m.stamina.current = Math.max(0, m.stamina.current - 1);
    pay = payLoyalty(m.wage, night.wagePaid);
    m.loyalty += pay + GREEDY_LOYALTY * night.greedyRules + (tired ? TIRED_LOYALTY : 0);
    m.corruption = clamp(staffDrift(m.corruption, night.madamCorruption, m.resolve) + STAFF_GREEDY_PUSH * night.greedyRules, 0, 100);
    if (staffTier(m.corruption) === "honest" && night.madamCorruption >= CROOKED_MADAM) m.loyalty += HONEST_UNDER_CROOK;
    m.records.nights++;
    const done = night.done ?? {};
    m.records.served += done.served ?? 0;
    m.records.bookings += done.bookings ?? 0;
    m.records.throwOuts += done.throwOuts ?? 0;
    m.records.dances += done.dances ?? 0;
    m.records.tips += done.tips ?? 0;
    m.records.gropes = (m.records.gropes ?? 0) + (done.gropes ?? 0);
    m.records.revels = (m.records.revels ?? 0) + (done.revels ?? 0);
    if (m.records.nights % SKILL_NIGHTS === 0) m.skill = Math.min(10, m.skill + 1);
    if (pay >= 0 && !tired) m.fame += 1;
    m.lewdness = Math.max(m.lewdness, staffLewdness(m.records));
  } else {
    m.stamina.current = m.stamina.max;
    m.loyalty += REST_LOYALTY;
  }
  if (night.houseFame - m.fame >= HOUSE_LIFT_GAP) m.fame += 1;
  m.fame = clamp(m.fame, 0, 100);
  m.loyalty = clamp(m.loyalty, 0, 100);

  const earned = earnedStaffPassives(m);
  m.passives.push(...earned);
  let mood: StaffMood;
  if (m.loyalty <= 0) {
    m.quit = true;
    mood = "quit";
  } else if (m.loyalty < RESENTFUL_LOYALTY || pay < 0) mood = "resentful";
  else if (tired || m.stamina.current <= 0) mood = "worn";
  else if (m.loyalty >= HAPPY_LOYALTY) mood = "happy";
  else mood = "steady";

  const beat = m.quit ? null : arcDue(m);
  // A step up tonight gets its story card, once (CORRUPTION_TROPES.md); nobody who's walked out gets one.
  const cards: StageCard[] = [];
  if (!m.quit) {
    const tier = STAFF_TIERS.indexOf(staffTier(m.corruption));
    if (tier > m.tierSeen) {
      m.tierSeen = tier;
      const step = STAFF_TIERS[tier];
      if (step !== "honest") cards.push(staffTierCard(m, step));
    }
    const stage = mindStage(m.lewdness);
    if (stage > m.stageSeen) {
      m.stageSeen = stage;
      cards.push(staffStageCard(m, ARC_STAGES[stage] as Exclude<ArcStage, "sheltered">));
    }
    // Their Legend: a card each time it rises, and one when nights off bring them back.
    const legend = staffLegendStep(m.legend, m.lewdness, night.worked);
    m.legend = legend.state;
    if (legend.change === "rise") cards.push(staffStageCard(m, "legend"));
    if (legend.change === "fall") cards.push(staffLegendBackCard(m));
  }
  const line =
    mood === "quit"
      ? `${m.name} packed up and left before dawn. They'd had enough of this house.`
      : `${m.name} ${MOOD_TEXT[mood]} (loyalty ${Math.round(m.loyalty)}, fame ${Math.round(m.fame)}, ${staffTier(m.corruption)}, ${staffStage(m)}).${
          earned.length > 0 ? ` New: ${earned.map((id) => STAFF_PASSIVE_BY_ID[id].name).join(", ")}.` : ""
        }`;
  return {
    member: m,
    dawn: {
      mood,
      loyalty: m.loyalty - before.loyalty,
      fame: m.fame - before.fame,
      corruption: m.corruption - before.corruption,
      skill: m.skill - before.skill,
      passives: earned,
      beat,
      line,
      cards,
    },
  };
}

// ---------- Passives ----------

export interface StaffPassive {
  id: string;
  name: string;
  /** What earns it, and what it does, for the Staff page. */
  detail: string;
  earned: (m: StaffMember) => boolean;
}

/** The staff's own passives (STAFF.md §3, late), earned from their records. Their effects hook in with tavern.ts. */
export const STAFF_PASSIVES: readonly StaffPassive[] = [
  { id: "quick_hands", name: "Quick Hands", detail: "200 orders served. Serves a little faster.", earned: (m) => m.records.served >= 200 },
  { id: "never_spills", name: "Never Spills", detail: "600 orders served. Guests she serves tip a little more.", earned: (m) => m.records.served >= 600 },
  { id: "wall_of_the_door", name: "Wall of the Door", detail: "20 rough guests shown the door. Trouble starts less often.", earned: (m) => m.records.throwOuts >= 20 },
  { id: "iron_ladle", name: "Iron Ladle", detail: "30 nights in the kitchen. The stew never burns.", earned: (m) => m.job === "cook" && m.records.nights >= 30 },
  { id: "house_favourite", name: "House Favourite", detail: "25 bookings upstairs. More guests ask for them by name.", earned: (m) => m.records.bookings >= 25 },
  { id: "bar_top_star", name: "Bar-Top Star", detail: "30 dances on the bar. Dances draw a bigger crowd.", earned: (m) => m.records.dances >= 30 },
  { id: "well_tipped", name: "Well Tipped", detail: "300 gold in tips. Their charm counts for a little more.", earned: (m) => m.records.tips >= 300 },
  { id: "old_hand", name: "Old Hand", detail: "60 nights worked. Needs a night off less often.", earned: (m) => m.records.nights >= 60 },
  {
    id: "true_to_the_house",
    name: "True to the House",
    detail: "Loyalty 90 after 20 nights. The Velvet House can't poach them.",
    earned: (m) => m.loyalty >= 90 && m.records.nights >= 20,
  },
];

export const STAFF_PASSIVE_BY_ID: Readonly<Record<string, StaffPassive>> = Object.fromEntries(STAFF_PASSIVES.map((p) => [p.id, p]));

/** The passives they've earned and don't have yet (their ids, in table order). */
export function earnedStaffPassives(member: StaffMember): string[] {
  return STAFF_PASSIVES.filter((p) => !member.passives.includes(p.id) && p.earned(member)).map((p) => p.id);
}

// ---------- Their stories ----------

export interface ArcOutcome {
  id: string;
  /** How it goes, in a line. */
  text: string;
}

export interface ArcBeat {
  id: string;
  title: string;
  /** The beat, in a line or two (the full cards go in staffarcs.ts). */
  text: string;
  /** What brings it on: nights worked, and loyalty at least or under. All that are given must hold. */
  trigger: { nights?: number; loyaltyAtLeast?: number; loyaltyBelow?: number };
  outcomes: readonly ArcOutcome[];
}

/** Each roster member's story (STAFF.md §5): 3 or 4 beats, played in order. */
export const STAFF_ARCS: Readonly<Record<string, readonly ArcBeat[]>> = {
  tamsin: [
    {
      id: "tamsin_debt",
      title: "What she owes",
      text: "Tamsin tells you what she still owes Sabine, and that Sabine has started asking for it.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "listen", text: "You hear her out and promise nothing." },
        { id: "offer_help", text: "You say the Lantern will stand behind her." },
      ],
    },
    {
      id: "tamsin_collector",
      title: "Sabine's man",
      text: "A man from the Velvet House waits at the bar for Tamsin, and won't leave without her.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "send_off", text: "Your doorman sees him out. Heat up, and Tamsin breathes again." },
        { id: "pay_him", text: "You pay him something to go. Gold down." },
        { id: "let_her_choose", text: "You let Tamsin talk to him alone." },
      ],
    },
    {
      id: "tamsin_end",
      title: "Free and clear",
      text: "Tamsin has to settle it with Sabine, one way or another.",
      trigger: { nights: 25, loyaltyAtLeast: 40 },
      outcomes: [
        { id: "stays_fights", text: "She stays, and helps you bring the Velvet House down." },
        { id: "back_to_sabine", text: "She goes back to Sabine." },
        { id: "buys_out", text: "She buys out her own debt and leaves free." },
      ],
    },
  ],
  maud: [
    {
      id: "maud_letter",
      title: "A letter from home",
      text: "Maud reads a letter twice and puts it away. The tax man has set a date for the farm.",
      trigger: { nights: 4 },
      outcomes: [
        { id: "ask", text: "You ask her about it." },
        { id: "leave_be", text: "You leave her be." },
      ],
    },
    {
      id: "maud_extra",
      title: "Extra shifts",
      text: "Maud asks to work every night she can, for the extra coin.",
      trigger: { nights: 10 },
      outcomes: [
        { id: "allow", text: "You let her. Her stamina runs low, but her savings grow." },
        { id: "raise", text: "You raise her wage instead." },
        { id: "refuse", text: "You keep her hours as they are." },
      ],
    },
    {
      id: "maud_taxman",
      title: "The tax man",
      text: "The Baron's tax man comes to the bar, looking for Maud.",
      trigger: { nights: 18 },
      outcomes: [
        { id: "stand_with", text: "You stand beside her while he talks." },
        { id: "stay_out", text: "You stay out of it." },
      ],
    },
    {
      id: "maud_end",
      title: "The farm",
      text: "The date comes due on the farm.",
      trigger: { nights: 26 },
      outcomes: [
        { id: "farm_saved", text: "The farm is saved. She leaves on good terms and sends farmers your way." },
        { id: "farm_lost", text: "The farm is lost. She stays, harder than before." },
        { id: "you_paid", text: "You pay off the farm yourself. Her loyalty is yours for life." },
      ],
    },
  ],
  corvin: [
    {
      id: "corvin_dice",
      title: "Dice in the kitchen",
      text: "You find Corvin dicing with two smugglers by the back door.",
      trigger: { nights: 4 },
      outcomes: [
        { id: "warn", text: "You warn him off." },
        { id: "ignore", text: "You say nothing." },
      ],
    },
    {
      id: "corvin_lean",
      title: "Leaning on the house",
      text: "The smugglers start leaning on the tavern for what Corvin owes.",
      trigger: { nights: 10 },
      outcomes: [
        { id: "pay_debt", text: "You pay his debt and take it from his wages." },
        { id: "skim", text: "Corvin skims the till to pay it. His corruption rises." },
        { id: "refuse_them", text: "You tell the smugglers to collect from him, not you." },
      ],
    },
    {
      id: "corvin_end",
      title: "Settling up",
      text: "The smugglers come for the last of what's owed.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "debt_paid", text: "The debt is paid, and Corvin swears off the dice." },
        { id: "kitchen_burns", text: "The smugglers fire the kitchen. A brawl night, and repairs to pay for." },
      ],
    },
  ],
  ash: [
    {
      id: "ash_name",
      title: "Not his name",
      text: "A soldier at the bar calls Ash by another name. Ash doesn't answer to it.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "ask", text: "You ask him who he really is." },
        { id: "cover", text: "You tell the soldier he's mistaken." },
      ],
    },
    {
      id: "ash_look",
      title: "The garrison looks",
      text: "Two officers ask after a deserter who fits Ash's look.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "hide", text: "You keep him off the door for a week." },
        { id: "lie", text: "You lie to the officers' faces. Heat up." },
        { id: "give_up", text: "You give him up to the Baron. Heat down, respect down, and the rest of the staff lose heart." },
      ],
    },
    {
      id: "ash_end",
      title: "The door",
      text: "Ash decides whether he stays in town for good.",
      trigger: { nights: 22, loyaltyAtLeast: 50 },
      outcomes: [
        { id: "hidden", text: "He stays hidden for good, under the name you gave him." },
        { id: "last_night", text: "He'll stand at your door on the last night." },
      ],
    },
  ],
  lysa: [
    {
      id: "lysa_crest",
      title: "A crest on a ring",
      text: "A guest notices the ring Lysa wears, and the crest on it.",
      trigger: { nights: 4 },
      outcomes: [
        { id: "hide_ring", text: "Lysa puts the ring away." },
        { id: "keep_ring", text: "She keeps wearing it." },
      ],
    },
    {
      id: "lysa_men",
      title: "Her father's men",
      text: "Her family's men come to take her home.",
      trigger: { nights: 10 },
      outcomes: [
        { id: "turn_away", text: "You turn them away. Her loyalty rises; a noble enemy." },
        { id: "talk", text: "You let them talk to her, with your doorman near." },
      ],
    },
    {
      id: "lysa_end",
      title: "Home or here",
      text: "Lysa has to choose where she belongs.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "goes_home", text: "She goes home." },
        { id: "disowned", text: "She stays and is disowned." },
        { id: "patron", text: "Her family pays the tavern to look after her: gold, and a noble patron." },
      ],
    },
  ],
  wynn: [
    {
      id: "wynn_two",
      title: "Two prayers",
      text: "Brother Wynn opens the service with Oden's words and ends it with Veyra's.",
      trigger: { nights: 4 },
      outcomes: [
        { id: "ask", text: "You ask him which god he serves." },
        { id: "let_be", text: "You let him find his own way." },
      ],
    },
    {
      id: "wynn_oden",
      title: "Oden's chapel calls",
      text: "The chapel sends word asking Wynn to come back.",
      trigger: { nights: 10 },
      outcomes: [
        { id: "urge_chapel", text: "You tell him to go and see them." },
        { id: "urge_church", text: "You tell him the church pays better." },
      ],
    },
    {
      id: "wynn_end",
      title: "His faith",
      text: "Wynn makes his choice.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "chapel", text: "Back to the chapel: Oden's ally." },
        { id: "church", text: "Deep into the church: a priest who recruits from your bar." },
        { id: "leaves", text: "He leaves town." },
      ],
    },
  ],
  pip: [
    {
      id: "pip_book",
      title: "The little book",
      text: "You find Pip's little book: lodgers' names, and what they said in their sleep.",
      trigger: { nights: 4 },
      outcomes: [
        { id: "read", text: "You read it." },
        { id: "give_back", text: "You give it back unread." },
      ],
    },
    {
      id: "pip_buyer",
      title: "A buyer",
      text: "A stranger pays Pip for a page, and someone sees it.",
      trigger: { nights: 10 },
      outcomes: [
        { id: "share", text: "You ask for a share of what she sells." },
        { id: "forbid", text: "You tell her to stop selling." },
        { id: "use", text: "You tell her to sell only to you." },
      ],
    },
    {
      id: "pip_end",
      title: "What she knows",
      text: "The Ledger's enemies find out what Pip knows.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "informant", text: "She becomes your best informant." },
        { id: "caught", text: "She's caught by the Ledger's enemies." },
        { id: "honest", text: "She burns the book and turns honest." },
      ],
    },
  ],
  sylvie: [
    {
      id: "sylvie_tonic",
      title: "A tonic too strong",
      text: "One of Sylvie's tonics leaves a soldier seeing double, and the garrison wants to know what's in it.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "stand_by", text: "You stand by her brew." },
        { id: "water_it", text: "You tell her to water it down." },
      ],
    },
    {
      id: "sylvie_court",
      title: "Word from Sylvaran",
      text: "An elf envoy at the bar recognises her, and asks why a court herbalist is stirring stew.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "hide", text: "You say she's just your cook." },
        { id: "let_her_speak", text: "You let her answer for herself." },
      ],
    },
    {
      id: "sylvie_end",
      title: "Root and branch",
      text: "The court sends for her: come home, or be struck from her family's line.",
      trigger: { nights: 20, loyaltyAtLeast: 50 },
      outcomes: [
        { id: "stays", text: "She stays, and grows a garden behind the tavern." },
        { id: "goes", text: "She goes home, and sends rare herbs every season." },
        { id: "both", text: "She answers the court from your kitchen, and they come to her." },
      ],
    },
  ],
  bru: [
    {
      id: "bru_cask",
      title: "Her own cask",
      text: "Brunhild wants a corner of the cellar for her own cask, and the first barrel is nearly ready.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "give_corner", text: "You give her the corner." },
        { id: "not_yet", text: "You tell her not yet." },
      ],
    },
    {
      id: "bru_rivals",
      title: "Deephold brewers",
      text: "A Deephold brewery offers to buy her recipe, and to buy her with it.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "back_her", text: "You back her: the recipe stays hers." },
        { id: "broker", text: "You broker the sale for a share." },
      ],
    },
    {
      id: "bru_end",
      title: "The contest",
      text: "The pass's drinking contest: her ale against the Deephold's best.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "wins", text: "Her ale wins, and the whole pass drinks it at your bar." },
        { id: "loses", text: "She loses, laughs, and brews twice as hard." },
        { id: "leaves", text: "She wins and opens her own brewhouse, and sells you every cask." },
      ],
    },
  ],
  grukka: [
    {
      id: "grukka_old_band",
      title: "The old band",
      text: "Grukka's old mercenary band comes through, and they want her back for the war in the east.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "let_choose", text: "You tell her it's her choice." },
        { id: "ask_stay", text: "You ask her to stay." },
      ],
    },
    {
      id: "grukka_dare",
      title: "A dare at the door",
      text: "A knight bets he can get past her. The whole room wants to watch.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "let_fight", text: "You let her take the bet." },
        { id: "stop_it", text: "You stop it before it starts." },
      ],
    },
    {
      id: "grukka_end",
      title: "Blood debt",
      text: "Someone from the east names a debt of blood against her, and comes to collect.",
      trigger: { nights: 20, loyaltyAtLeast: 40 },
      outcomes: [
        { id: "stand_with", text: "You stand at the door with her." },
        { id: "pay_off", text: "You pay the debt in gold." },
        { id: "she_goes", text: "She goes east to settle it herself." },
      ],
    },
  ],
  mirri: [
    {
      id: "mirri_rival",
      title: "A rival dancer",
      text: "A dancer from the Velvet House comes to watch Mirri, and to copy her.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "dance_off", text: "You set up a dance-off." },
        { id: "ignore", text: "You tell her to ignore it." },
      ],
    },
    {
      id: "mirri_kin",
      title: "Her kin",
      text: "Her family's river town sends word: her sister is in trouble with the toll.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "send_gold", text: "You send gold." },
        { id: "send_word", text: "You send word to Silas instead." },
      ],
    },
    {
      id: "mirri_end",
      title: "The big stage",
      text: "A theatre in the capital offers her a season on the big stage.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "stays", text: "She turns it down and stays your star." },
        { id: "goes", text: "She goes, and the capital hears of your tavern." },
        { id: "tour", text: "She tours, and comes back every winter." },
      ],
    },
  ],
  hikari: [
    {
      id: "hikari_sword",
      title: "A sword to sharpen",
      text: "Hikari can't afford to have her sword sharpened, and won't take charity.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "advance", text: "You give her an advance on her wages." },
        { id: "work_it_off", text: "You let her work it off." },
      ],
    },
    {
      id: "hikari_summoners",
      title: "Her summoners",
      text: "The mages who summoned her turn up at the bar. They want their hero back.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "hide_her", text: "You hide her." },
        { id: "let_meet", text: "You let her meet them." },
      ],
    },
    {
      id: "hikari_end",
      title: "The way home",
      text: "The mages find a way to send her home, one way, once.",
      trigger: { nights: 20, loyaltyAtLeast: 50 },
      outcomes: [
        { id: "stays", text: "She stays: this is home now." },
        { id: "goes", text: "She goes home, and leaves you her sword." },
        { id: "hero", text: "She stays to be the pass's hero, out of your tavern." },
      ],
    },
  ],
  edda: [
    {
      id: "edda_books",
      title: "The books don't add up",
      text: "Edda finds the books don't add up, and asks whether she's to find out why.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "find_out", text: "You tell her to find out." },
        { id: "leave_it", text: "You tell her to leave it." },
      ],
    },
    {
      id: "edda_outfits",
      title: "Outfits for sale",
      text: "Her outfits sell faster than she can sew them, and the Velvet House wants some.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "sell_all", text: "You sell to anyone who pays." },
        { id: "house_only", text: "You keep them for your house." },
      ],
    },
    {
      id: "edda_end",
      title: "His letters",
      text: "A bundle of her husband's letters from the east turns up, and one isn't to her.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "burn", text: "She burns them and starts again here." },
        { id: "follow", text: "She follows the letters east." },
        { id: "shop", text: "She opens a shop beside the tavern." },
      ],
    },
  ],
  clara: [
    {
      id: "clara_house",
      title: "Her old house",
      text: "A steward from her old house comes asking after a missing maid.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "cover", text: "You say you've never seen her." },
        { id: "let_her_choose", text: "You let her face him." },
      ],
    },
    {
      id: "clara_secret",
      title: "What she took",
      text: "Clara admits she took something from the house: a letter that could ruin a lord.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "keep", text: "You tell her to keep it safe." },
        { id: "sell", text: "You sell it." },
        { id: "return", text: "You send it back." },
      ],
    },
    {
      id: "clara_end",
      title: "Her own name",
      text: "The lord offers her a pardon and a place, if she comes back.",
      trigger: { nights: 20, loyaltyAtLeast: 50 },
      outcomes: [
        { id: "stays", text: "She stays, and runs your floor." },
        { id: "goes", text: "She goes back, and sends you noble guests." },
      ],
    },
  ],
  snik: [
    {
      id: "snik_song",
      title: "A song about you",
      text: "Snik writes a song about the tavern, and about you. It's catchy. Very catchy.",
      trigger: { nights: 5 },
      outcomes: [
        { id: "let_play", text: "You let him play it." },
        { id: "ban_it", text: "You ban it." },
      ],
    },
    {
      id: "snik_deal",
      title: "A goblin deal",
      text: "Snik's cousins from the Cog Towns want to sell recordings of him at your bar.",
      trigger: { nights: 12 },
      outcomes: [
        { id: "take_share", text: "You take a share." },
        { id: "say_no", text: "You say no." },
      ],
    },
    {
      id: "snik_end",
      title: "The Cog Town stage",
      text: "The biggest stage in the Cog Towns offers him a season.",
      trigger: { nights: 20 },
      outcomes: [
        { id: "stays", text: "He stays, and the song makes you famous." },
        { id: "goes", text: "He goes, and plays your song in every town." },
        { id: "both", text: "He records it all here and sends it out on every phone." },
      ],
    },
  ],
};

/** The next beat of their story, if what brings it on holds now; null if none is due or their story is done. */
export function arcDue(member: StaffMember): ArcBeat | null {
  const beat = STAFF_ARCS[member.id]?.[member.arcBeat];
  if (!beat) return null;
  const t = beat.trigger;
  if (t.nights !== undefined && member.records.nights < t.nights) return null;
  if (t.loyaltyAtLeast !== undefined && member.loyalty < t.loyaltyAtLeast) return null;
  if (t.loyaltyBelow !== undefined && member.loyalty >= t.loyaltyBelow) return null;
  return beat;
}

/** Plays the beat that's due with one of its outcomes, moving their story on. Returns a copy; null if it doesn't fit. */
export function playBeat(member: StaffMember, outcomeId: string): StaffMember | null {
  const beat = arcDue(member);
  if (!beat || !beat.outcomes.some((o) => o.id === outcomeId)) return null;
  return { ...member, arcBeat: member.arcBeat + 1 };
}

// ---------- Recruitment: rarity, perks, applicants and friends ----------

/** How rare a find someone is. */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export const RARITIES: readonly Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
export const RARITY_NAME: Readonly<Record<Rarity, string>> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
/** The odds of each rarity among random applicants, in percent (they add up to 100). */
export const RARITY_ODDS: Readonly<Record<Rarity, number>> = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
/** Rolled stats (skill, appeal, charm) by rarity, [least, most]; and stamina. */
export const RARITY_STATS: Readonly<Record<Rarity, readonly [number, number]>> = {
  common: [2, 5],
  uncommon: [3, 6],
  rare: [4, 7],
  epic: [5, 8],
  legendary: [6, 9],
};
/** The chance an Uncommon applicant brings a (small) perk. Rarer ones always bring one; Common never. */
export const UNCOMMON_PERK_CHANCE = 0.2;

/** A roll 0 to 1, as `Math.random` gives. */
export type StaffRng = () => number;

/** A rarity, from the odds. */
export function rollRarity(rng: StaffRng): Rarity {
  let at = rng() * 100;
  for (const r of RARITIES) {
    at -= RARITY_ODDS[r];
    if (at < 0) return r;
  }
  return "common";
}

/** Which perk tier a rarity draws from: "friend" perks are only the roster's own. */
export type PerkTier = "uncommon" | "rare" | "epic" | "legendary" | "friend";

export interface StaffPerk {
  id: string;
  name: string;
  tier: PerkTier;
  detail: string;
  /** What it does while they work for her (added in tavern.ts refreshEffects). */
  effect?: (e: Effects) => void;
  /** What it adds each night they work: house fame and fans. */
  nightly?: { fame?: number; fans?: number };
  /** More stamina, given when they're taken on. */
  stamina?: number;
}

/** The perks (the pool random applicants draw from, by tier, and the friends' own). */
export const STAFF_PERKS: readonly StaffPerk[] = [
  // Uncommon: small.
  { id: "tidy", name: "Tidy", tier: "uncommon", detail: "A messy room wears on guests 15% less.", effect: (e) => (e.tidy += 0.15) },
  { id: "warm_smile", name: "Warm Smile", tier: "uncommon", detail: "Guests wait 10% longer.", effect: (e) => (e.patience += 0.1) },
  { id: "iron_gut", name: "Iron Gut", tier: "uncommon", detail: "Drinks with the guests so you don't have to: drink gets to you 15% slower.", effect: (e) => (e.drunkRate += 0.15) },
  { id: "tireless", name: "Tireless", tier: "uncommon", detail: "+2 stamina: more nights in a row.", stamina: 2 },
  // Rare: one good perk.
  { id: "perk_quick_hands", name: "Quick Hands", tier: "rare", detail: "The stew cooks 20% faster.", effect: (e) => (e.cookSpeed += 0.2) },
  { id: "bouncers_glare", name: "Bouncer's Glare", tier: "rare", detail: "Trouble starts 15% less often.", effect: (e) => (e.trouble += 0.15) },
  { id: "silver_tongue", name: "Silver Tongue", tier: "rare", detail: "Helps talk brawls down: +1 to talking in a fight.", effect: (e) => (e.fightTalk += 1) },
  { id: "sharp_ears", name: "Sharp Ears", tier: "rare", detail: "Hears secrets: +2 gold for each one sold.", effect: (e) => (e.secretGold += 2) },
  // Epic: one strong perk.
  { id: "crowd_pleaser", name: "Crowd Pleaser", tier: "epic", detail: "+1 house fame every night they work.", nightly: { fame: 1 } },
  { id: "hearth_keeper", name: "Hearth Keeper", tier: "epic", detail: "The stew keeps 50% longer and cooks 25% faster.", effect: (e) => { e.burnGrace += 0.5; e.cookSpeed += 0.25; } },
  { id: "barroom_diplomat", name: "Barroom Diplomat", tier: "epic", detail: "+2 to talking in a fight, and trouble starts 10% less often.", effect: (e) => { e.fightTalk += 2; e.trouble += 0.1; } },
  // Legendary.
  { id: "golden_touch", name: "Golden Touch", tier: "legendary", detail: "+1 gold on every tipped serve, and +5% on everything.", effect: (e) => { e.serveTip += 1; e.payPct += 0.05; } },
  { id: "living_legend", name: "Living Legend", tier: "legendary", detail: "Has fans of their own: +2 fans and +1 fame every night they work.", nightly: { fame: 1, fans: 2 } },
  // The friends' own (one each, never rolled).
  { id: "velvet_knowhow", name: "Velvet Know-how", tier: "friend", detail: "Knows the trade: +2 gold on every booking upstairs.", effect: (e) => (e.upstairsGold += 2) },
  { id: "farm_friends", name: "Farm Friends", tier: "friend", detail: "The farmers trust a house she works in: +1 trust a night.", effect: (e) => (e.perNight.trust += 1) },
  { id: "smugglers_prices", name: "Smugglers' Prices", tier: "friend", detail: "Gets the good stuff cheap: +1 gold on every bottle.", effect: (e) => (e.bottleGold += 1) },
  { id: "old_soldier", name: "Old Soldier", tier: "friend", detail: "Stands with you in a brawl: +1 damage, and trouble starts 10% less often.", effect: (e) => { e.fightDamage += 1; e.trouble += 0.1; } },
  { id: "noble_patrons", name: "Noble Patrons", tier: "friend", detail: "Her family's friends pay to see her well: +2 gold a night, +2 on every dance.", effect: (e) => { e.perNight.gold += 2; e.showGold += 2; } },
  { id: "two_faiths", name: "Two Faiths", tier: "friend", detail: "Chapel and church both send their folk: +1 respect a night.", effect: (e) => (e.perNight.respect += 1) },
  { id: "the_ledger", name: "The Ledger", tier: "friend", detail: "Writes everything down: +3 gold for each secret sold.", effect: (e) => (e.secretGold += 3) },
  { id: "herbal_tonics", name: "Herbal Tonics", tier: "friend", detail: "Elven tonics behind the bar: drink gets to you 20% slower, and guests wait 10% longer.", effect: (e) => { e.drunkRate += 0.2; e.patience += 0.1; } },
  { id: "deephold_cask", name: "Deephold Cask", tier: "friend", detail: "Her own cask: +2 gold on every bottle, and guests ask for one 20% more.", effect: (e) => { e.bottleGold += 2; e.bottleAsk += 0.2; } },
  { id: "tusked_welcome", name: "Tusked Welcome", tier: "friend", detail: "Nobody starts anything under her eye: trouble 20% less often, +1 damage in a brawl.", effect: (e) => { e.trouble += 0.2; e.fightDamage += 1; } },
  { id: "nine_lives", name: "Nine Lives", tier: "friend", detail: "The room can't look away: +3 gold on every dance, and guests offer coin for a look 20% more.", effect: (e) => { e.showGold += 3; e.showAsk += 0.2; } },
  { id: "heros_luck", name: "Hero's Luck", tier: "friend", detail: "A summoned hero at your side: +2 damage and +1 talking in a brawl.", effect: (e) => { e.fightDamage += 2; e.fightTalk += 1; } },
  { id: "needle_and_thread", name: "Needle and Thread", tier: "friend", detail: "Fits and mends your clothes: the room loses 25% less patience while you put a piece back on.", effect: (e) => (e.redress += 0.25) },
  { id: "service_manners", name: "Service Manners", tier: "friend", detail: "A lady's maid's manners: guests wait 15% longer, and +3% on everything.", effect: (e) => { e.patience += 0.15; e.payPct += 0.03; } },
  { id: "tavern_songs", name: "Tavern Songs", tier: "friend", detail: "Songs about your house in every town: +1 fame and +1 fan every night he works.", nightly: { fame: 1, fans: 1 } },
];
export const STAFF_PERK_BY_ID: Readonly<Record<string, StaffPerk>> = Object.fromEntries(STAFF_PERKS.map((p) => [p.id, p]));

/** Each friend's own perk, and their rarity (most are Epic or Legendary). */
export const FRIEND_PERK: Readonly<Record<string, string>> = {
  tamsin: "velvet_knowhow",
  maud: "farm_friends",
  corvin: "smugglers_prices",
  ash: "old_soldier",
  lysa: "noble_patrons",
  wynn: "two_faiths",
  pip: "the_ledger",
  sylvie: "herbal_tonics",
  bru: "deephold_cask",
  grukka: "tusked_welcome",
  mirri: "nine_lives",
  hikari: "heros_luck",
  edda: "needle_and_thread",
  clara: "service_manners",
  snik: "tavern_songs",
};
export const FRIEND_RARITY: Readonly<Record<string, Rarity>> = {
  tamsin: "epic",
  maud: "epic",
  corvin: "epic",
  ash: "legendary",
  lysa: "legendary",
  wynn: "epic",
  pip: "legendary",
  sylvie: "epic",
  bru: "legendary",
  grukka: "epic",
  mirri: "epic",
  hikari: "legendary",
  edda: "rare",
  clara: "rare",
  snik: "epic",
};

/** Friendship, 0 up, with each roster person: at this, they'll work for her. */
export const FRIEND_AT = 5;
/** What a night's time spent with them adds. */
export const FRIEND_TIME = 1;

/** The perk an applicant of this rarity brings, if any (Common never; Uncommon sometimes; rarer, one of their tier). */
export function rollPerk(rarity: Rarity, rng: StaffRng): string | null {
  if (rarity === "common") return null;
  if (rarity === "uncommon" && rng() >= UNCOMMON_PERK_CHANCE) return null;
  const pool = STAFF_PERKS.filter((p) => p.tier === rarity);
  return pool[Math.floor(rng() * pool.length) % pool.length].id;
}

const FIRST_F = ["Bess", "Nell", "Greta", "Ivy", "Mara", "Elsie", "Rowan", "Hilde", "Sorrel", "Jenna", "Kit", "Odile"];
const FIRST_M = ["Tobin", "Garrick", "Ned", "Osric", "Bram", "Dunstan", "Hal", "Fenn", "Lorne", "Wat", "Emeric", "Jory"];
const LAST = ["of the Ford", "Millward", "Thatcher", "Brook", "Ashdown", "Cobb", "Fletcher", "Hale", "Marsh", "Reed"];

/** The jobs random applicants can come for at this stage (girls come through the Lantern, never off the street). */
export function applicantJobs(stage: Stage): StaffJob[] {
  const rank = STAGE_RANK[stage];
  return STAFF_JOBS.filter((j) => j !== "girl" && rank >= STAGE_RANK[JOB_UNLOCK[j]]);
}

/**
 * One random applicant, answering her notice: a made-up name, an adult (18 to 45), a job open at this stage, a
 * rarity from the odds, stats rolled by it, and a perk by it. `id` must be unique among her staff.
 */
export function rollApplicant(stage: Stage, rng: StaffRng, id: string): StaffMember | null {
  const jobs = applicantJobs(stage);
  if (jobs.length === 0) return null;
  const pick = <T>(list: readonly T[]) => list[Math.floor(rng() * list.length) % list.length];
  const rarity = rollRarity(rng);
  const [lo, hi] = RARITY_STATS[rarity];
  const stat = () => lo + Math.floor(rng() * (hi - lo + 1));
  const female = rng() < 0.5;
  const job = pick(jobs);
  const perk = rollPerk(rarity, rng);
  const skill = stat();
  const appeal = stat();
  const charm = stat();
  const stamina = stat() + (perk ? (STAFF_PERK_BY_ID[perk].stamina ?? 0) : 0);
  const rank = RARITIES.indexOf(rarity);
  const corruption = Math.floor(rng() * 50);
  return {
    id,
    name: `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`,
    age: 18 + Math.floor(rng() * 28),
    job,
    female,
    skill,
    appeal,
    charm,
    stamina: { current: stamina, max: stamina },
    loyalty: 40 + Math.floor(rng() * 21),
    corruption,
    resolve: stat(),
    lewdness: 0,
    fame: 0,
    wage: 2 + Math.floor((skill + appeal + charm) / 6) + rank,
    arcBeat: 0,
    records: { nights: 0, served: 0, bookings: 0, throwOuts: 0, dances: 0, tips: 0, gropes: 0, revels: 0 },
    passives: [],
    quit: false,
    rarity,
    perks: perk ? [perk] : [],
    tierSeen: STAFF_TIERS.indexOf(staffTier(corruption)),
    stageSeen: 0,
  };
}

/** How many applicants a notice draws, and how many nights before a fresh lot (or she pays to post again). */
export const APPLICANTS_SHOWN = 3;
export const APPLICANTS_EVERY = 3;
export const POSTING_FEE = 5;

/** A fresh lot of applicants; ids run on from `nextId`. */
export function rollApplicants(stage: Stage, rng: StaffRng, nextId: number, n = APPLICANTS_SHOWN): StaffMember[] {
  const out: StaffMember[] = [];
  for (let i = 0; i < n; i++) {
    const a = rollApplicant(stage, rng, `hire${nextId + i}`);
    if (a) out.push(a);
  }
  return out;
}

/** What one member's perks add while they work: house fame and fans, a night. */
export function perkNightly(member: StaffMember): { fame: number; fans: number } {
  let fame = 0;
  let fans = 0;
  for (const id of member.perks) {
    const n = STAFF_PERK_BY_ID[id]?.nightly;
    fame += n?.fame ?? 0;
    fans += n?.fans ?? 0;
  }
  return { fame, fans };
}

/** A saved member, checked: anything broken comes back as null and is dropped. */
export function readStaffMember(raw: unknown): StaffMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<StaffMember>;
  if (typeof m.id !== "string" || typeof m.name !== "string" || !STAFF_JOBS.includes(m.job as StaffJob)) return null;
  const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const rec = (m.records ?? {}) as Partial<StaffRecords>;
  const stamina = m.stamina && typeof m.stamina === "object" ? m.stamina : { current: 5, max: 5 };
  const corruption = n(m.corruption, 0);
  const lewdness = n(m.lewdness, 0);
  // An older save hasn't heard of any cards: the tier and stage they're at, so nothing's announced twice.
  const seen = (v: unknown, now: number, top: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(Math.floor(v), 0, top) : now);
  return {
    id: m.id,
    name: m.name,
    age: Math.max(18, n(m.age, 18)),
    job: m.job as StaffJob,
    female: m.female === true,
    skill: n(m.skill, 3),
    appeal: n(m.appeal, 3),
    charm: n(m.charm, 3),
    stamina: { current: n(stamina.current, 5), max: n(stamina.max, 5) },
    loyalty: n(m.loyalty, 50),
    corruption,
    resolve: n(m.resolve, 5),
    lewdness,
    fame: n(m.fame, 0),
    wage: n(m.wage, 0),
    arcBeat: n(m.arcBeat, 0),
    records: {
      nights: n(rec.nights, 0),
      served: n(rec.served, 0),
      bookings: n(rec.bookings, 0),
      throwOuts: n(rec.throwOuts, 0),
      dances: n(rec.dances, 0),
      tips: n(rec.tips, 0),
      gropes: n(rec.gropes, 0),
      revels: n(rec.revels, 0),
    },
    passives: Array.isArray(m.passives) ? m.passives.filter((id) => typeof id === "string" && id in STAFF_PASSIVE_BY_ID) : [],
    quit: m.quit === true,
    rarity: RARITIES.includes(m.rarity as Rarity) ? (m.rarity as Rarity) : "common",
    perks: Array.isArray(m.perks) ? m.perks.filter((id) => typeof id === "string" && id in STAFF_PERK_BY_ID) : [],
    tierSeen: seen(m.tierSeen, STAFF_TIERS.indexOf(staffTier(corruption)), STAFF_TIERS.length - 1),
    stageSeen: seen(m.stageSeen, mindStage(lewdness), 3),
    // An older save (or one never a Legend) has none.
    ...(m.legend ? { legend: readLegend(m.legend) } : {}),
    // Their post, if she's put them anywhere but their own job; older saves have them all on their own.
    ...(m.post === "rest" || (STAFF_JOBS.includes(m.post as StaffJob) && m.post !== m.job) ? { post: m.post } : {}),
  };
}
