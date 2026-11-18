/**
 * Feed Star: her side job on the town feed (FEED_STAR.md). The world has phones and a town feed that runs through
 * the Baron's relay stone (WORLD.md), so she can post from the tavern: a new stew, a pour, an outfit, and bolder
 * shots later. Followers, likes and sponsors come of it, and so do stalkers, gossip and Pell reading every word.
 * Pure rules, kept apart from tavern.ts and the DOM so they can be tested; the phone screen, the photo poses and the
 * stream's crystal are still to come (FEED_STAR.md §8).
 *
 * - **Posts** (`POSTS`, `postAllowed`, `scorePost`): six kinds in four boldness tiers, gated by her arc (lewd.ts)
 *   and by how far her Watched awakening has gone. A post earns likes and followers, fame for the bold ones and a
 *   cost in respect, and it may go viral (an injected roll).
 * - **Followers over time** (`followerDay`): they drift in when she posts and drift away when she doesn't. Once she
 *   Craves the feed, a quiet day leaves her restless.
 * - **Sponsors** (`SPONSORS`, `sponsorOffers`, `sponsorPayout`, `weekForDeal`, `breakDeal`): Brunhild's ale and
 *   Edda's dresses (two friends in staff.ts), and the Warm House late. Each offers at a follower count, pays for the
 *   posts that show its goods, and wants a few a week; breaking a deal costs her name and the friendship.
 * - **Risks** (`stalkerChance`, `rollRisks`): a stalker from boldness and followers, the Baron's men reading it (heat),
 *   and gossip.
 * - **The Watched awakening** (`watchedStage`, `WATCHED_PASSIVES`, `watchedEffects`, `earnedWatchedPassives`): her
 *   exhibitionism in four stages that track her arc (Shy, Curious, Craving, Known, never ahead of Sheltered, Curious,
 *   Willing, Known), earned from followers, likes and bold posts. Each stage's passive is data the night reads.
 * - **Four minigames, as pure scoring** (`photoShoot`, `replyDM`, `liveStream`, `trendChallenge`): the shoot's timing
 *   tap, the DM replies, the live stream's hype meter and the weekly trend's rhythm game.
 *
 * Fixed (the consent rule, GAME_PATH.MD): she chooses every post, every reply and every dare. Nothing is posted for
 * her; a dare she won't take is simply declined (a little hype lost, never more), and a dare above what she's ready
 * for can't be taken at all. Every character is an adult (18+). All randomness comes in through an injected `rng`.
 */
import { arcIndex, type ArcStage } from "./lewd";

/** A random source, 0 (inclusive) to 1 (exclusive), injected so the rules can be tested. */
export type FeedRng = () => number;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- The Watched awakening ----------

/**
 * Her exhibitionism, in four stages that follow her arc (lewd.ts ArcStage): Shy matches Sheltered, Curious matches
 * Curious, Craving matches Willing and Known matches Known. She's never further along here than her arc.
 */
export type WatchedStage = "shy" | "curious" | "craving" | "known";
export const WATCHED_STAGES: readonly WatchedStage[] = ["shy", "curious", "craving", "known"];
export const watchedIndex = (s: WatchedStage): number => WATCHED_STAGES.indexOf(s);

/** Her feed records: what the awakening and the passives read. */
export interface FeedRecords {
  followers: number;
  /** Likes on all her posts, ever. */
  totalLikes: number;
  /** Posts of tier 2 or bolder. */
  boldPosts: number;
  /** Posts that went viral. */
  virals: number;
  /** Live streams she saw through to the end. */
  streams: number;
}

export const EMPTY_RECORDS: FeedRecords = { followers: 0, totalLikes: 0, boldPosts: 0, virals: 0, streams: 0 };

/** What each stage past Shy needs on her records. */
export const WATCHED_AT: Readonly<Record<Exclude<WatchedStage, "shy">, { followers: number; totalLikes: number; boldPosts: number; virals: number }>> = {
  curious: { followers: 25, totalLikes: 200, boldPosts: 0, virals: 0 },
  craving: { followers: 150, totalLikes: 2000, boldPosts: 5, virals: 0 },
  known: { followers: 600, totalLikes: 10000, boldPosts: 12, virals: 1 },
};

/** Her Watched stage: the furthest her records reach, never past her arc. */
export function watchedStage(r: FeedRecords, arc: ArcStage): WatchedStage {
  let reached = 0;
  (["curious", "craving", "known"] as const).forEach((s, i) => {
    const need = WATCHED_AT[s];
    if (reached === i && r.followers >= need.followers && r.totalLikes >= need.totalLikes && r.boldPosts >= need.boldPosts && r.virals >= need.virals) reached = i + 1;
  });
  return WATCHED_STAGES[Math.min(reached, arcIndex(arc))];
}

/**
 * What the awakening does, as numbers the night and the feed read. Each stage's passive sets some of these; the
 * totals for a stage are `watchedEffects`.
 */
export interface WatchedEffects {
  /** Willpower a post costs her, per boldness tier (Shy: showing herself is hard). */
  boldWillpower: number;
  /** Body desire when a post does better than she hoped (Curious: the likes thrill her). */
  likeThrill: number;
  /** Chance each shift she stops to check her phone (Craving), and the desire a viral post gives her. */
  phoneCheck: number;
  viralThrill: number;
  /** Desire she starts the night with after a day without posting (Craving: restless). */
  quietRestless: number;
  /** Extra pleasure, as a fraction, while an audience watches (Known). */
  audiencePleasure: number;
  /** Multiplier on what her Exhibition passives give (Known). */
  exhibitionBoost: number;
}

export const NO_WATCHED_EFFECTS: WatchedEffects = {
  boldWillpower: 0,
  likeThrill: 0,
  phoneCheck: 0,
  viralThrill: 0,
  quietRestless: 0,
  audiencePleasure: 0,
  exhibitionBoost: 1,
};

export interface WatchedPassive {
  id: string;
  name: string;
  /** The stage it comes with, if it's a stage passive; the extras have none. */
  stage: WatchedStage | null;
  /** Requirement, in words, and as records (all must be met). */
  requirement: string;
  needs: Partial<FeedRecords>;
  benefit: string;
  cost: string;
  /** What it sets, merged over NO_WATCHED_EFFECTS (numbers add, exhibitionBoost multiplies). */
  effects: Partial<WatchedEffects>;
  /** Her thought when she earns it. */
  thought: string;
}

/** The Watched passives (PASSIVES_DESIGN.md, Exhibition group): one per stage, and two extras. */
export const WATCHED_PASSIVES: readonly WatchedPassive[] = [
  {
    id: "camera_shy",
    name: "Camera-Shy",
    stage: "shy",
    requirement: "her first post",
    needs: {},
    benefit: "none yet",
    cost: "every post past a plain one costs 2 willpower per boldness tier",
    effects: { boldWillpower: 2 },
    thought: "(Everyone in town can see this. Delete it. No. Leave it.)",
  },
  {
    id: "little_thrill",
    name: "Little Thrill",
    stage: "curious",
    requirement: "25 followers and 200 likes",
    needs: { followers: 25, totalLikes: 200 },
    benefit: "Body desire +6 when a post does better than expected; bold posts cost only 1 willpower a tier",
    cost: "none",
    effects: { boldWillpower: 1, likeThrill: 6 },
    thought: "(Forty-one likes. I keep looking at it.)",
  },
  {
    id: "refresh_refresh",
    name: "Refresh, Refresh",
    stage: "craving",
    requirement: "150 followers, 2000 likes and 5 bold posts",
    needs: { followers: 150, totalLikes: 2000, boldPosts: 5 },
    benefit: "bold posts cost no willpower; a viral post gives +15 desire; likes thrill her more (+8)",
    cost: "checks her phone mid-shift (25% a shift: a slower serve); a day with no post starts the night 10 desire up, restless",
    effects: { boldWillpower: 0, likeThrill: 8, phoneCheck: 0.25, viralThrill: 15, quietRestless: 10 },
    thought: "(Just one look. Just to see. ...Again.)",
  },
  {
    id: "everyones_watching",
    name: "Everyone's Watching",
    stage: "known",
    requirement: "600 followers, 10000 likes, 12 bold posts and a post gone viral",
    needs: { followers: 600, totalLikes: 10000, boldPosts: 12, virals: 1 },
    benefit: "+15% pleasure while an audience watches; Exhibition passives give 25% more",
    cost: "still checks her phone (20% a shift); quiet days still leave her restless",
    effects: { boldWillpower: 0, likeThrill: 8, phoneCheck: 0.2, viralThrill: 20, quietRestless: 10, audiencePleasure: 0.15, exhibitionBoost: 1.25 },
    thought: "(Let them look. That's what I'm for, isn't it.)",
  },
  {
    id: "went_viral",
    name: "Went Viral",
    stage: null,
    requirement: "3 posts gone viral",
    needs: { virals: 3 },
    benefit: "a viral post's desire thrill +5",
    cost: "none",
    effects: { viralThrill: 5 },
    thought: "(Half the pass has seen me now.)",
  },
  {
    id: "crystal_darling",
    name: "Crystal Darling",
    stage: null,
    requirement: "5 live streams seen through",
    needs: { streams: 5 },
    benefit: "+5% pleasure while an audience watches",
    cost: "none",
    effects: { audiencePleasure: 0.05 },
    thought: "(The crystal's warm in my hands. They're all in there, watching.)",
  },
];

const meets = (r: FeedRecords, needs: Partial<FeedRecords>) =>
  (Object.keys(needs) as (keyof FeedRecords)[]).every((k) => r[k] >= (needs[k] ?? 0));

/**
 * The Watched passives she holds: the stage passive for her stage only (each stage's replaces the one before), plus
 * any extras her records earn. Camera-Shy needs at least one post (one like or one follower) to show up.
 */
export function earnedWatchedPassives(r: FeedRecords, arc: ArcStage): string[] {
  const stage = watchedStage(r, arc);
  const started = r.totalLikes > 0 || r.followers > 0;
  return WATCHED_PASSIVES.filter((p) => (p.stage === null ? meets(r, p.needs) : p.stage === stage && started)).map((p) => p.id);
}

/** The effects of the passives she holds, merged: numbers set by her stage passive, extras added on top. */
export function watchedEffects(ids: readonly string[]): WatchedEffects {
  const e: WatchedEffects = { ...NO_WATCHED_EFFECTS };
  const held = WATCHED_PASSIVES.filter((p) => ids.includes(p.id));
  for (const p of held.filter((q) => q.stage !== null)) Object.assign(e, p.effects);
  for (const p of held.filter((q) => q.stage === null)) {
    for (const [k, v] of Object.entries(p.effects) as [keyof WatchedEffects, number][]) {
      e[k] = k === "exhibitionBoost" ? e[k] * v : e[k] + v;
    }
  }
  return e;
}

/** Craving and on: does she stop to check her phone this shift? */
export function checksPhone(e: WatchedEffects, rng: FeedRng): boolean {
  return e.phoneCheck > 0 && rng() < e.phoneCheck;
}

// ---------- Posts ----------

/** Boldness: 0 plain, 1 flirty, 2 bold, 3 bare. */
export type Boldness = 0 | 1 | 2 | 3;
export type PostKind = "stew" | "pour" | "outfit" | "tease" | "lingerie" | "bare";
export const POST_KINDS: readonly PostKind[] = ["stew", "pour", "outfit", "tease", "lingerie", "bare"];

export interface PostDef {
  name: string;
  tier: Boldness;
  /** Likes from nobody (the town browsing) before followers count. */
  baseLikes: number;
  /** Her caption, roughly. */
  caption: string;
}

export const POSTS: Readonly<Record<PostKind, PostDef>> = {
  stew: { name: "Tonight's stew", tier: 0, baseLikes: 6, caption: "New pot on at the Tarven. Come hungry." },
  pour: { name: "A perfect pour", tier: 0, baseLikes: 8, caption: "Head like a cloud. First one's poured by me." },
  outfit: { name: "Outfit check", tier: 1, baseLikes: 14, caption: "New dress for service tonight. Thoughts?" },
  tease: { name: "Leaning over the bar", tier: 2, baseLikes: 24, caption: "Long night. Somebody buy the barmaid a drink." },
  lingerie: { name: "After hours, in lace", tier: 2, baseLikes: 30, caption: "Doors are shut. Just me and the candles." },
  bare: { name: "Nothing on but the apron", tier: 3, baseLikes: 50, caption: "Laundry day. Don't tell the Baron." },
};

/**
 * Can she post this? A tier needs her arc at least that far (tier 1 Curious, 2 Willing, 3 Known), and her Watched
 * stage no more than one step behind it (a bare post needs her Craving at least).
 */
export function postAllowed(kind: PostKind, arc: ArcStage, watched: WatchedStage): boolean {
  const t = POSTS[kind].tier;
  return arcIndex(arc) >= t && watchedIndex(watched) >= t - 1;
}

export function allowedPosts(arc: ArcStage, watched: WatchedStage): PostKind[] {
  return POST_KINDS.filter((k) => postAllowed(k, arc, watched));
}

/** Respect each tier costs a post, and fame it brings. A viral bold post doubles the respect lost. */
export const POST_RESPECT: readonly number[] = [0, 0, -1, -3];
export const POST_FAME: readonly number[] = [0, 1, 2, 3];
/** Viral: base chance, +per tier, +for a great photo (by quality), never past the cap; a viral post's likes ×5. */
export const VIRAL_BASE = 0.02;
export const VIRAL_PER_TIER = 0.04;
export const VIRAL_QUALITY = 0.06;
export const VIRAL_CAP = 0.3;
export const VIRAL_MULT = 5;
export const VIRAL_FAME = 3;
/** A post's likes per follower, before tier and quality; and one new follower for this many likes. */
export const LIKES_PER_FOLLOWER = 0.12;
export const LIKES_PER_NEW_FOLLOWER = 6;

export interface PostInput {
  kind: PostKind;
  /** The photo's quality, 0 to 1 (photoShoot). */
  quality: number;
  followers: number;
  /** Her Watched effects (watchedEffects). */
  effects: WatchedEffects;
}

export interface PostResult {
  likes: number;
  newFollowers: number;
  fame: number;
  respect: number;
  viral: boolean;
  /** What it costs her (Shy) and what it gives her (Curious and on). */
  willpower: number;
  bodyDesire: number;
  line: string;
}

/** What she'd expect a post to get: the line above which likes thrill her. */
export function expectedLikes(kind: PostKind, followers: number): number {
  const t = POSTS[kind].tier;
  return Math.round(POSTS[kind].baseLikes + followers * LIKES_PER_FOLLOWER * (1 + t * 0.5));
}

/** A post goes up: its likes, the followers it brings, what it does to her name, and whether it goes viral. */
export function scorePost(p: PostInput, rng: FeedRng): PostResult {
  const def = POSTS[p.kind];
  const t = def.tier;
  const q = clamp(p.quality, 0, 1);
  const viralChance = Math.min(VIRAL_CAP, VIRAL_BASE + t * VIRAL_PER_TIER + q * VIRAL_QUALITY);
  const viral = rng() < viralChance;
  const swing = 0.8 + rng() * 0.4;
  let likes = Math.round(expectedLikes(p.kind, p.followers) * (0.5 + q) * swing);
  if (viral) likes *= VIRAL_MULT;
  const newFollowers = Math.floor(likes / LIKES_PER_NEW_FOLLOWER);
  const respect = POST_RESPECT[t] * (viral && t >= 2 ? 2 : 1);
  const fame = POST_FAME[t] + (viral ? VIRAL_FAME : 0);
  const willpower = 0 - p.effects.boldWillpower * t;
  const thrilled = likes > expectedLikes(p.kind, p.followers);
  const bodyDesire = (thrilled ? p.effects.likeThrill : 0) + (viral ? p.effects.viralThrill : 0);
  const line = viral
    ? `"${def.caption}" is everywhere. ${likes} likes and climbing.`
    : thrilled
      ? `"${def.caption}" does well: ${likes} likes.`
      : `"${def.caption}" gets ${likes} likes.`;
  return { likes, newFollowers, fame, respect, viral, willpower, bodyDesire, line };
}

/** Add a post's result to her records. */
export function recordPost(r: FeedRecords, kind: PostKind, res: PostResult): FeedRecords {
  return {
    ...r,
    followers: r.followers + res.newFollowers,
    totalLikes: r.totalLikes + res.likes,
    boldPosts: r.boldPosts + (POSTS[kind].tier >= 2 ? 1 : 0),
    virals: r.virals + (res.viral ? 1 : 0),
  };
}

// ---------- Followers over time ----------

/** Quiet days she gets free, and the share of followers lost each quiet day after; a few always stay. */
export const QUIET_GRACE = 1;
export const QUIET_DECAY = 0.03;
export const LOYAL_FLOOR = 10;
/** A day she posted: a small drift in from people sharing it (a share of her followers). */
export const POST_DAY_GROWTH = 0.02;

export interface FollowerDay {
  followers: number;
  /** Desire she starts tonight with (Craving: a quiet day leaves her restless). */
  restless: number;
}

/** A day passes: she posted or she didn't (`quietDays` counts today if she didn't). */
export function followerDay(followers: number, postedToday: boolean, quietDays: number, e: WatchedEffects): FollowerDay {
  if (postedToday) return { followers: followers + Math.floor(followers * POST_DAY_GROWTH), restless: 0 };
  const restless = e.quietRestless;
  if (quietDays <= QUIET_GRACE || followers <= LOYAL_FLOOR) return { followers, restless };
  const lost = Math.max(1, Math.floor(followers * QUIET_DECAY));
  return { followers: Math.max(LOYAL_FLOOR, followers - lost), restless };
}

// ---------- Sponsors ----------

export type SponsorId = "brunhild" | "edda" | "warmhouse";
export const SPONSOR_IDS: readonly SponsorId[] = ["brunhild", "edda", "warmhouse"];

export interface SponsorDef {
  name: string;
  /** Who it is (staff.ts for the two friends). */
  who: string;
  /** Followers before they offer, and her least Watched stage for it. */
  followersAt: number;
  stageAt: WatchedStage;
  /** Posts that show their goods. */
  kinds: readonly PostKind[];
  /** Gold per such post, more for a good photo; and how many a week they want. */
  pay: number;
  perWeek: number;
  offer: string;
  broken: string;
}

export const SPONSORS: Readonly<Record<SponsorId, SponsorDef>> = {
  brunhild: {
    name: "Copperkeg Ale",
    who: "Brunhild Copperkeg, the dwarf brewer (staff.ts)",
    followersAt: 50,
    stageAt: "shy",
    kinds: ["pour", "tease"],
    pay: 5,
    perWeek: 2,
    offer: "Brunhild slams a cask on the bar. \"Put my ale in your pictures and I'll pay you for every one. Deal?\"",
    broken: "Brunhild takes her cask back without a word. The cellar feels emptier.",
  },
  edda: {
    name: "Thornwick Dresses",
    who: "Edda Thornwick, the seamstress (staff.ts)",
    followersAt: 120,
    stageAt: "curious",
    kinds: ["outfit", "lingerie"],
    pay: 9,
    perWeek: 2,
    offer: "Edda holds up something green and very short. \"Wear my work where the town can see it, and I'll pay.\"",
    broken: "Edda's next letter is short and polite, and there's no dress with it.",
  },
  warmhouse: {
    name: "The Warm House",
    who: "the Church of Veyra (CHURCH_CONCEPT.md)",
    followersAt: 400,
    stageAt: "craving",
    kinds: ["lingerie", "bare"],
    pay: 15,
    perWeek: 1,
    offer: "A priestess in red leaves a ribbon on the bar. \"Veyra likes to be seen. So, we hear, do you.\"",
    broken: "The red ribbons stop turning up on the bar.",
  },
};

export interface SponsorDeal {
  id: SponsorId;
  /** Posts showing their goods so far this week. */
  postsThisWeek: number;
}

/** Sponsors who'd offer her a deal now: enough followers, her stage, and not already signed (or already broken). */
export function sponsorOffers(followers: number, watched: WatchedStage, signed: readonly SponsorId[], broken: readonly SponsorId[] = []): SponsorId[] {
  return SPONSOR_IDS.filter(
    (id) => !signed.includes(id) && !broken.includes(id) && followers >= SPONSORS[id].followersAt && watchedIndex(watched) >= watchedIndex(SPONSORS[id].stageAt),
  );
}

/** What a sponsor pays for a post: nothing unless it shows their goods; a good photo (0.7+) pays half again. */
export function sponsorPayout(id: SponsorId, kind: PostKind, quality: number): number {
  const s = SPONSORS[id];
  if (!s.kinds.includes(kind)) return 0;
  return quality >= 0.7 ? Math.round(s.pay * 1.5) : s.pay;
}

/** Breaking a deal: respect and followers lost, and the friend's goodwill (staff loyalty, for the two friends). */
export const BREAK_RESPECT = -1;
export const BREAK_FOLLOWERS = 0.05;
export const BREAK_LOYALTY = -15;

export interface DealBreak {
  respect: number;
  followersLost: number;
  loyalty: number;
  line: string;
}

export function breakDeal(id: SponsorId, followers: number): DealBreak {
  return {
    respect: BREAK_RESPECT,
    followersLost: Math.floor(followers * BREAK_FOLLOWERS),
    loyalty: id === "warmhouse" ? 0 : BREAK_LOYALTY,
    line: SPONSORS[id].broken,
  };
}

/** The week's end: kept if she made their posts, a warning the first time she didn't, broken the second. */
export function weekForDeal(deal: SponsorDeal, missedBefore: boolean): "kept" | "warned" | "broken" {
  if (deal.postsThisWeek >= SPONSORS[deal.id].perWeek) return "kept";
  return missedBefore ? "broken" : "warned";
}

// ---------- Risks ----------

/** A stalker: from her boldness and her followers, never past the cap. */
export const STALKER_BASE = 0.005;
export const STALKER_PER_TIER = 0.03;
export const STALKER_PER_FOLLOWER = 1 / 10000;
export const STALKER_CAP = 0.3;

export function stalkerChance(tier: Boldness, followers: number): number {
  return Math.min(STALKER_CAP, STALKER_BASE + tier * STALKER_PER_TIER + followers * STALKER_PER_FOLLOWER);
}

/** The Baron's men read the relay: a chance per post by tier, and heat when they do (more for a bare one). */
export const BARON_READ: readonly number[] = [0.05, 0.1, 0.25, 0.45];
export const BARON_HEAT: readonly number[] = [0, 1, 1, 2];
/** Gossip: a bold post, or any post gone viral, gets talked about. */
export const GOSSIP_CHANCE: readonly number[] = [0, 0.1, 0.3, 0.6];

export interface RiskResult {
  stalker: boolean;
  baronRead: boolean;
  heat: number;
  gossip: boolean;
  lines: string[];
}

export function rollRisks(tier: Boldness, followers: number, viral: boolean, rng: FeedRng): RiskResult {
  const stalker = rng() < stalkerChance(tier, followers);
  const baronRead = rng() < BARON_READ[tier] + (viral ? 0.2 : 0);
  const heat = baronRead ? BARON_HEAT[tier] + (viral && tier >= 2 ? 1 : 0) : 0;
  const gossip = viral || rng() < GOSSIP_CHANCE[tier];
  const lines: string[] = [];
  if (stalker) lines.push("The same account has liked every post, and tonight he's at the end of the bar, not drinking.");
  if (baronRead) lines.push(heat > 0 ? "Pell's men were reading. Somebody at the keep has your picture now." : "Pell's men read it on the relay. Nothing in it they can use.");
  if (gossip) lines.push("The Bakehouse long table has seen it. So has everyone they'll tell.");
  return { stalker, baronRead, heat, gossip, lines };
}

// ---------- Minigame (a): the photo shoot ----------

export type ShootOutfit = "apron" | "dress" | "lace" | "nothing";
export type ShootProp = "stew" | "tankard" | "candle" | "mirror";
export type ShootAngle = "front" | "shoulder" | "above" | "low";

/**
 * Each outfit's boldness tier, and what a daring angle adds to it (down her top from above, up her skirt from low).
 * An angle adds nothing to the apron: a stew shot from above is just a stew shot.
 */
export const OUTFIT_TIER: Readonly<Record<ShootOutfit, Boldness>> = { apron: 0, dress: 1, lace: 2, nothing: 3 };
export const ANGLE_ADDS: Readonly<Record<ShootAngle, number>> = { front: 0, shoulder: 0, above: 1, low: 1 };
/** The prop that suits each post. */
export const POST_PROP: Readonly<Record<PostKind, ShootProp>> = {
  stew: "stew",
  pour: "tankard",
  outfit: "mirror",
  tease: "tankard",
  lingerie: "candle",
  bare: "candle",
};
/** Angles that flatter each post. */
export const POST_ANGLES: Readonly<Record<PostKind, readonly ShootAngle[]>> = {
  stew: ["above", "front"],
  pour: ["front", "low"],
  outfit: ["front", "shoulder"],
  tease: ["above", "shoulder"],
  lingerie: ["shoulder", "low"],
  bare: ["shoulder", "low"],
};
/** The timing tap: how far off the moment light and pose line up (ms), and what each window scores. */
export const SHOOT_WINDOWS: readonly { within: number; score: number; grade: string }[] = [
  { within: 60, score: 1, grade: "perfect" },
  { within: 150, score: 0.7, grade: "good" },
  { within: 300, score: 0.4, grade: "blurry" },
];
export const SHOOT_MISS = 0.1;

export interface ShootChoices {
  post: PostKind;
  outfit: ShootOutfit;
  prop: ShootProp;
  angle: ShootAngle;
}

export interface ShootResult {
  /** 0 to 1, for scorePost. */
  quality: number;
  grade: string;
  /** The shot's boldness (the post's tier, or the outfit and angle's if bolder): use it for the post's risks. */
  tier: Boldness;
}

/**
 * The shoot: she picks an outfit, a prop and an angle, then taps when the light and her pose line up. Half the
 * quality is the tap, a quarter the prop that suits the post, and a quarter the angle.
 */
export function photoShoot(c: ShootChoices, tapOffsetMs: number): ShootResult {
  const off = Math.abs(tapOffsetMs);
  const w = SHOOT_WINDOWS.find((x) => off <= x.within);
  const timing = w ? w.score : SHOOT_MISS;
  const prop = POST_PROP[c.post] === c.prop ? 1 : 0.3;
  const angle = POST_ANGLES[c.post].includes(c.angle) ? 1 : 0.4;
  const quality = Math.round((timing * 0.5 + prop * 0.25 + angle * 0.25) * 100) / 100;
  const worn = OUTFIT_TIER[c.outfit];
  const tier = Math.max(POSTS[c.post].tier, worn === 0 ? 0 : Math.min(3, worn + ANGLE_ADDS[c.angle])) as Boldness;
  return { quality, grade: w ? w.grade : "missed", tier };
}

// ---------- Minigame (b): comments and DMs ----------

export type DmKind = "fan" | "flirt" | "creep" | "gift" | "sponsor";
export type DmChoice = "charm" | "tease" | "ignore" | "block";
export const DM_CHOICES: readonly DmChoice[] = ["charm", "tease", "ignore", "block"];

export interface Dm {
  kind: DmKind;
  from: string;
  text: string;
}

/** Sample messages, by kind; the feed fills in names. */
export const DM_SAMPLES: Readonly<Record<DmKind, readonly string[]>> = {
  fan: ["Best stew on the pass. When's the next one?", "Saw your post, coming in tonight!"],
  flirt: ["That dress though.", "Save me a seat at the end of the bar?"],
  creep: ["I know which window is yours.", "Why don't you answer me? I've seen you every night."],
  gift: ["Left something at the bar for you. Wear it?", "Sent you a mana-stone. Charge that phone, gorgeous."],
  sponsor: ["We make boots. You'd look good in them. Want to talk?", "Our cider, your pictures. Interested?"],
};

export interface DmOutcome {
  /** Loyal followers (charm) and hype (teasing), the next post's likes as a share. */
  loyal: number;
  hype: number;
  /** A stalker's chance goes up (the share added), or a gift's gold, or a sponsor's offer. */
  stalkerRisk: number;
  gold: number;
  sponsorOffer: boolean;
  respect: number;
  line: string;
}

const DM_NONE: DmOutcome = { loyal: 0, hype: 0, stalkerRisk: 0, gold: 0, sponsorOffer: false, respect: 0, line: "" };

/**
 * Her reply to one message. Charm builds loyal followers, teasing builds hype; teasing a creep feeds him, blocking
 * him ends it. A gift is kept by a warm reply (a teasing one gets more, and the giver expects more). A sponsor's
 * message is an offer if she answers it at all. Ignoring is always safe and does nothing.
 */
export function replyDM(dm: Dm, choice: DmChoice, rng: FeedRng): DmOutcome {
  if (choice === "ignore") return { ...DM_NONE, line: "You leave it on read." };
  if (choice === "block") {
    return dm.kind === "creep"
      ? { ...DM_NONE, stalkerRisk: -0.05, line: `You block ${dm.from}. The messages stop. For now.` }
      : { ...DM_NONE, loyal: -1, line: `You block ${dm.from}. Harsh, but it's your feed.` };
  }
  switch (dm.kind) {
    case "fan":
      return choice === "charm" ? { ...DM_NONE, loyal: 2, line: `${dm.from} is yours for life.` } : { ...DM_NONE, loyal: 1, hype: 0.05, line: `${dm.from} sends back a row of hearts.` };
    case "flirt":
      return choice === "charm"
        ? { ...DM_NONE, loyal: 1, line: `${dm.from} promises to come in tonight.` }
        : { ...DM_NONE, hype: 0.1, respect: rng() < 0.3 ? -1 : 0, line: `${dm.from} screenshots it. It's going round.` };
    case "creep":
      return choice === "charm"
        ? { ...DM_NONE, stalkerRisk: 0.03, line: `${dm.from} takes your kindness as a yes to something.` }
        : { ...DM_NONE, stalkerRisk: 0.08, hype: 0.02, line: `${dm.from} writes back at once. And again. And again.` };
    case "gift": {
      const gold = 3 + Math.floor(rng() * 6);
      return choice === "charm"
        ? { ...DM_NONE, gold, loyal: 1, line: `${dm.from}'s gift is worth ${gold} gold. You thank them sweetly.` }
        : { ...DM_NONE, gold: gold * 2, hype: 0.05, stalkerRisk: 0.02, line: `You tease ${dm.from} and the gift doubles. They'll want a picture of you wearing it.` };
    }
    case "sponsor":
      return { ...DM_NONE, sponsorOffer: true, hype: choice === "tease" ? 0.05 : 0, line: `${dm.from} sends terms. You can think about it.` };
  }
}

// ---------- Minigame (c): the live stream on a scrying crystal ----------

export interface StreamRequest {
  id: string;
  /** Seconds into the stream it comes in, and how long before it expires. */
  at: number;
  ttl: number;
  /** The dare's boldness, and the tip it carries. */
  tier: Boldness;
  tip: number;
  text: string;
}

export interface StreamResponse {
  id: string;
  /** Seconds into the stream she answered, and whether she took it (her choice, always). */
  at: number;
  accept: boolean;
}

export const STREAM_START_HYPE = 50;
export const STREAM_MAX_HYPE = 100;
/** Hype lost per second of quiet; won by a dare taken (+ per tier); lost by a decline or an expired request. */
export const STREAM_DECAY = 1;
export const STREAM_TAKE = 8;
export const STREAM_TAKE_TIER = 6;
export const STREAM_DECLINE = 3;
export const STREAM_EXPIRE = 6;
/** One new follower per this much peak hype, at the end of a stream she saw through. */
export const STREAM_FOLLOWERS_PER_HYPE = 4;

export interface StreamResult {
  hype: number;
  peak: number;
  tips: number;
  taken: number;
  declined: number;
  missed: number;
  /** The chat drifted off (hype hit 0) before the end, and when. */
  endedEarly: boolean;
  lasted: number;
  newFollowers: number;
}

/**
 * A live stream: requests come in, each with a time to live; she answers before it expires or it's missed. Taking
 * a dare raises hype (bolder, more) and earns its tip (×(1+tier)); declining costs a little hype; a missed request
 * costs more. Hype drains every second. A dare bolder than `maxTier` (what her arc and stage allow) can't be taken:
 * accepting it counts as a decline. If hype hits 0 the stream ends there.
 */
export function liveStream(requests: readonly StreamRequest[], responses: readonly StreamResponse[], duration: number, maxTier: Boldness): StreamResult {
  type Ev = { at: number; kind: "answer" | "expire"; req: StreamRequest; accept: boolean };
  const evs: Ev[] = [];
  for (const req of requests) {
    if (req.at >= duration) continue;
    const r = responses.find((x) => x.id === req.id && x.at >= req.at && x.at <= req.at + req.ttl && x.at <= duration);
    if (r) evs.push({ at: r.at, kind: "answer", req, accept: r.accept });
    else if (req.at + req.ttl <= duration) evs.push({ at: req.at + req.ttl, kind: "expire", req, accept: false });
  }
  evs.sort((a, b) => a.at - b.at);
  let hype = STREAM_START_HYPE;
  let peak = hype;
  let now = 0;
  let tips = 0;
  let taken = 0;
  let declined = 0;
  let missed = 0;
  const drainTo = (t: number): boolean => {
    hype -= (t - now) * STREAM_DECAY;
    if (hype <= 0) {
      now += (t - now) + hype / STREAM_DECAY;
      hype = 0;
      return false;
    }
    now = t;
    return true;
  };
  for (const ev of evs) {
    if (!drainTo(ev.at)) break;
    if (ev.kind === "expire") {
      missed++;
      hype -= STREAM_EXPIRE;
    } else if (ev.accept && ev.req.tier <= maxTier) {
      taken++;
      tips += ev.req.tip * (1 + ev.req.tier);
      hype += STREAM_TAKE + STREAM_TAKE_TIER * ev.req.tier;
    } else {
      declined++;
      hype -= STREAM_DECLINE;
    }
    hype = Math.min(STREAM_MAX_HYPE, hype);
    peak = Math.max(peak, hype);
    if (hype <= 0) {
      hype = 0;
      break;
    }
  }
  if (hype > 0) drainTo(duration);
  const endedEarly = hype <= 0;
  const lasted = Math.round(Math.min(duration, now) * 10) / 10;
  return {
    hype: Math.round(hype),
    peak: Math.round(peak),
    tips,
    taken,
    declined,
    missed,
    endedEarly,
    lasted,
    newFollowers: endedEarly ? 0 : Math.floor(peak / STREAM_FOLLOWERS_PER_HYPE),
  };
}

// ---------- Minigame (d): trend challenges ----------

export type TrendId = "ale" | "bartop" | "outfitcheck";
export const TREND_IDS: readonly TrendId[] = ["ale", "bartop", "outfitcheck"];

export interface TrendDef {
  tag: string;
  what: string;
  tier: Boldness;
  /** The beats she taps to, in ms from the start. */
  beats: readonly number[];
}

export const TRENDS: Readonly<Record<TrendId, TrendDef>> = {
  ale: { tag: "#AleChallenge", what: "Down a tankard in time to the drum, without spilling a drop", tier: 0, beats: [500, 1000, 1500, 2000, 2250, 2500, 3000] },
  bartop: { tag: "#BarTopDance", what: "Up on the bar, on the beat, as the room claps", tier: 2, beats: [400, 800, 1200, 1400, 1600, 2000, 2400, 2600, 2800, 3200] },
  outfitcheck: { tag: "#OutfitCheck", what: "A twirl and a pose on every snap of the fingers", tier: 1, beats: [600, 1200, 1800, 2100, 2400, 3000] },
};

/** Can she join this trend? The same gate as a post of its tier (postAllowed). */
export function trendAllowed(trend: TrendId, arc: ArcStage, watched: WatchedStage): boolean {
  const t = TRENDS[trend].tier;
  return arcIndex(arc) >= t && watchedIndex(watched) >= t - 1;
}

/** This week's trend: they come round in turn. */
export function weeklyTrend(week: number): TrendId {
  return TREND_IDS[((Math.floor(week) % TREND_IDS.length) + TREND_IDS.length) % TREND_IDS.length];
}

/** Each beat's window (ms) and what it scores; a tap that hits no beat costs a point. */
export const TREND_WINDOWS: readonly { within: number; points: number }[] = [
  { within: 50, points: 3 },
  { within: 120, points: 2 },
  { within: 200, points: 1 },
];
export const TREND_STRAY = 1;

export type Placement = 1 | 2 | 3 | "top10" | "unplaced";
/** Accuracy (points over the most possible) each placement needs. */
export const PLACE_AT: readonly { acc: number; place: Placement; followers: number }[] = [
  { acc: 0.9, place: 1, followers: 60 },
  { acc: 0.75, place: 2, followers: 35 },
  { acc: 0.6, place: 3, followers: 20 },
  { acc: 0.4, place: "top10", followers: 8 },
];

export interface TrendResult {
  accuracy: number;
  placement: Placement;
  newFollowers: number;
  /** A top-three spot catches a sponsor's eye. */
  sponsorAttention: boolean;
  /** The trend's boldness, for its risks (rollRisks) and respect. */
  tier: Boldness;
}

/** Her taps (ms from the start) against the trend's beats: each beat takes the nearest unused tap in its window. */
export function trendChallenge(trend: TrendId, taps: readonly number[]): TrendResult {
  const def = TRENDS[trend];
  const used = new Set<number>();
  let points = 0;
  for (const beat of def.beats) {
    let best = -1;
    let bestOff = Infinity;
    taps.forEach((t, i) => {
      const off = Math.abs(t - beat);
      if (!used.has(i) && off < bestOff) {
        best = i;
        bestOff = off;
      }
    });
    const w = TREND_WINDOWS.find((x) => bestOff <= x.within);
    if (best >= 0 && w) {
      used.add(best);
      points += w.points;
    }
  }
  points -= (taps.length - used.size) * TREND_STRAY;
  const accuracy = Math.max(0, Math.round((points / (def.beats.length * TREND_WINDOWS[0].points)) * 100) / 100);
  const hit = PLACE_AT.find((p) => accuracy >= p.acc);
  const placement: Placement = hit ? hit.place : "unplaced";
  return {
    accuracy,
    placement,
    newFollowers: hit ? hit.followers : 0,
    sponsorAttention: placement === 1 || placement === 2 || placement === 3,
    tier: def.tier,
  };
}
