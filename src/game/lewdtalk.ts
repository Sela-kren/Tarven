/**
 * Lewd talk, the way Karryn's Prison does it (RemtairyEnemySex.js dmgFormula_basicTalk, RemtairyKarrynPassives.js
 * talk passives, RemtairyLines.js enemyline_Talk_*):
 *
 * - A foe who wants her but can't have her yet talks dirty about a part of her. It raises her desire for that part,
 *   and once she's learned to like hearing it (her talk sensitivity, 0 at the start, raised by passives), her pleasure.
 * - Erect and not angry, he strokes himself while he talks (KP's jerk-off talk): it works him towards the top faster,
 *   and once she's watched it enough, it works on her more too.
 * - Every time she's talked at about a part counts. 12, 38 and 70 times (KP's numbers) earn that part's talk passives:
 *   her desire there can go higher, and each part has KP's own second and third effect (passives.ts TALK_PASSIVES).
 *   KP counts each new one who talks in a brawl, not each line. Losing brawls is what opens her to it (KP's Defeated
 *   Count passives), and watching them stroke it has its own three.
 * - What he says goes by what the room knows about her (KP's reaction score and published edicts): never done it and
 *   proper, he talks about being her first; easy and talked about, about what he's heard; lewd and famous for it, about
 *   her being the town's. The House edicts that post her on the board (tavernrules.ts, KP's Publish edicts) tell them
 *   more; No Foul Mouths (KP's talk resist) blunts it.
 * - In the taproom, a leering guest's remark as she takes his order counts too (KP's waitress/receptionist talk).
 *
 * Pure rules, kept apart from fight.ts so they can be tested.
 */
import type { LewdPart } from "./brawlai";
import type { FightTier } from "./fightface";

export const LEWD_PARTS: readonly LewdPart[] = ["mouth", "breasts", "butt", "pussy", "cock"];

/** One line's desire (KP's BASEDMG_TALK 9, on Tarven's 0 to 100): this, and up to TALK_SPREAD - 1 more. */
export const TALK_DESIRE = 3;
export const TALK_SPREAD = 4;
/** What a mouthy foe (the talker prefix) adds, KP's enemy talk level: more desire, and more pleasure per point. */
export const TALKER_LEVEL = 2;
/** KP's enemyLvl × 0.75: the pleasure a line carries on top of the desire, before her sensitivity. */
export const TALK_PLEASURE_BASE = 2;
/** A leering guest's remark in the taproom is a passing one: this share of a brawl line. */
export const LEER_SHARE = 0.5;

/** Times she's been talked at about a part for each of its passives (KP: 12, 38, 70). */
export const TALK_TIERS: readonly number[] = [12, 38, 70];
/** How much higher each talk passive lets that desire go (KP: max desire +5, +10, +15). */
export const TALK_CAP_PLUS = 5;
/** The first: that desire fills this much faster (KP's desire gain rate). */
export const TALK_GAIN_RATE = 0.05;
/**
 * The second, per part, each "for every new one who talks about it this brawl" (KP's _tempRecordTalkedAbout...People):
 * Mouth, her mouth desire fills faster (KP +2% to +40%... on Tarven's scale +3% to +30%); Breasts, stares get to her more
 * (KP's sight resist down); Butt, they reach for her more (KP's petting resist down); Pussy, she gets wetter every turn;
 * Cock, cock desire fills faster (KP +5% to +100%).
 */
export const TALK_STACK = { per: 0.03, max: 0.3 } as const;
export const COCK_STACK = { per: 0.05, max: 1 } as const;
export const TALK_SIGHT = { per: 0.1, max: 0.5 } as const;
export const TALK_GROPE = { per: 0.05, max: 0.25 } as const;
export const TALK_WET = 1;
/**
 * The third, per part: when one of them comes in or on it, she feels it more for every new one who's talked about it
 * this brawl (KP's swallow, bukkake and creampie sensitivity); Cock's, the chance cock talk tips her into horny (KP 15%).
 */
export const TALK_COME = { per: 4, max: 20 } as const;
export const TALK_HORNY = 0.15;

/** Jerk-off talk: what it adds to his pleasure, and the times she's watched it for each of its passives (KP 5, 25, 70). */
export const JERK_PLEASURE = 10;
export const JERK_SEEN: readonly number[] = [5, 25, 70];
/** How much more desire a jerk-off line stirs once she's watched it enough (KP ×1.2, ×1.5): none for the first. */
export const JERK_DESIRE: readonly number[] = [0, 0.2, 0.5];

/** Brawls lost for each of the defeat passives that open her to lewd talk (KP's Defeated Count: 1, 7, 14). */
export const DEFEAT_TALK: readonly number[] = [1, 7, 14];

// ---------- Sight: a foe staring at what's bare (KP's dmgFormula_basicSight, Sight passives) ----------

/** The parts of her a foe can stare at (her face, KP's "mouth", is always on show; there's no cock to stare at). */
export const SIGHT_PARTS: readonly LewdPart[] = ["mouth", "breasts", "butt", "pussy"];
/** One stare's desire (KP's BASEDMG_SIGHT), and what a leering foe (the starer prefix) adds: KP's enemy sight level. */
export const SIGHT_DESIRE = 4;
export const STARER_LEVEL = 2;
/** Times she's been stared at about a part for each of its passives (KP: 15, 54, 73). */
export const SIGHT_TIERS: readonly number[] = [15, 54, 73];
/** First sight passives: that desire rises this much every round of a brawl (KP's "desire rises every turn"). */
export const SIGHT_EVERY = 1;
/**
 * Second, per part, for every new one who stares at it this brawl: face and pussy, that desire every round (up to 3);
 * breasts, her sight sensitivity (KP +0.05 each, up to 0.3); rear, they reach for her more (KP's petting resist down).
 */
export const SIGHT_EVERY_PER = { per: 1, max: 3 } as const;
export const SIGHT_SENSE_PER = { per: 0.05, max: 0.3 } as const;
/** Third, per part: that desire fills faster for every new one who stares at it this brawl (KP's desire gain rate). */
export const SIGHT_STACK = { per: 0.05, max: 0.5 } as const;
/** Leering Pleasure and the rest: stares do more for every new one staring (KP's sight resist down). */
export const SIGHT_RATE_PER = { per: 0.05, max: 0.3 } as const;
/** Pleasure every round while she's bare, for each of them still standing (KP: by the number of men present), up to 4 men. */
export const NAKED_PLEASURE = 0.5;
export const NAKED_MEN_MAX = 4;
/** How bare counts as naked for that. */
export const NAKED_AT = 0.95;
/** Target of Vulgar Gazes: their blows take this much less (or, Undone by Their Eyes, more) for every new one staring, up to 3. */
export const SIGHT_GUARD_MAX = 3;
/** Stares made her come: the passives for it (KP's Sight Orgasm, 1 and 10). Stared at by this many: KP's Sight People. */
export const SIGHT_PEOPLE = 10;

/** What one stare does to her: desire for the part, and pleasure. Same shape as talk's (KP uses one formula for both). */
export function sightGain(o: { lvl: number; sense: number; rate: number }): { desire: number; pleasure: number } {
  const rate = 1 + o.rate;
  const desire = (SIGHT_DESIRE + o.lvl) * rate;
  const pleasure = (desire + TALK_PLEASURE_BASE * rate) * o.sense * (1 + o.lvl * 0.1);
  return { desire, pleasure };
}

// ---------- See No Evil, Hear No Evil, Speak No Evil (KP's willpower skills, unlocked by edicts) ----------

/** What each costs in willpower (KP: 10, 10, 15, on Tarven's smaller willpower). */
export const NO_EVIL_COST = { seeNoEvil: 4, hearNoEvil: 4, speakNoEvil: 6 } as const;
/** How long See and Hear No Evil hold: this round and the next, so she can have both up for Speak No Evil. */
export const NO_EVIL_ROUNDS = 2;

/** How much of stares (See) or talk (Hear) she shuts out: KP's (30 + Mind)%, on Tarven's Mind levels. */
export function noEvilCut(mind: number): number {
  return Math.min(0.8, 0.4 + (mind - 1) * 0.05);
}

/** Speak No Evil: how much she takes off every desire, by her Mind (KP: -10 + Mind × 1.33, at least 1). */
export function speakNoEvilDown(mind: number): number {
  return Math.max(1, 5 + (mind - 1) * 2);
}

/** What her passives and edicts make of lewd talk (passives.ts Effects), handed to the brawl. */
export interface TalkStats {
  /** KP's talk sensitivity: how much of a line turns into pleasure. 0, it's only desire. */
  sense: number;
  /** KP's talk element rate, over 1: how much more every line does to her (negative: less, her talk resist). */
  rate: number;
  /** Second talk passives, Mouth and Cock: how much faster that desire fills, per new one who talks about it this brawl. */
  stack: Partial<Record<LewdPart, number>>;
  /** Breasts' second: how much more a stare stirs her, per new one who talks about her breasts this brawl. */
  sight: number;
  /** Butt's second (her rear), and Words Like Hands (anyone): how much likelier a grope, per new one who talks. */
  gropeButt: number;
  grope: number;
  /** Pussy's second: pussy desire every turn, per new one who talks about it this brawl. */
  wet: number;
  /** Thirds: pleasure when one comes in or on the part, per new one who talked about it this brawl. */
  come: Partial<Record<LewdPart, number>>;
  /** Cock's third: the chance cock talk tips her into horny. */
  horny: number;
  /** Watching them stroke it: how much more desire a jerk-off line stirs. */
  jerk: number;
  /** Per new one who talks lewd at her this brawl: extra damage (Pretty Words), or less (Just Keep Talking). */
  damage: number;
  /** Per new one who talks lewd at her this brawl: less chance to talk or stare them down (Hang on Every Word, KP's Mind down). */
  mindDown: number;
  /** Talk lands twice as hard while she's horny (Just Keep Talking, KP's talk crits). */
  crit: boolean;
  /** Edicts: fame the room acts on beyond her own (her profile posted), what she's never done posted, her weak spots posted. */
  known: number;
  firsts: boolean;
  aim: boolean;
  /** Sight: her sight sensitivity (0 at the start, like talk's) and how much more every stare does to her. */
  sightSense: number;
  sightRate: number;
  /** First sight passives: that desire every round of a brawl. */
  sightEvery: Partial<Record<LewdPart, number>>;
  /** Seconds, face and pussy: that desire every round, per new one staring at it this brawl. */
  sightEveryPer: Partial<Record<LewdPart, number>>;
  /** Breasts' second: sight sensitivity per new one staring at her chest this brawl. Rear's: grope chance per starer. */
  sightSenseBreasts: number;
  sightGropeButt: number;
  /** Thirds: how much faster that desire fills, per new one staring at it this brawl. */
  sightStack: Partial<Record<LewdPart, number>>;
  /** Per new one staring this brawl: how much more stares do (Leering Pleasure), and more sight sensitivity (Willing Eye Candy). */
  sightRatePer: number;
  sightSensePer: number;
  /** Pleasure every round while she's bare, per man standing (Leering Pleasure and the rest). */
  naked: number;
  /** Per new one staring this brawl: less off her from their blows (Target of Vulgar Gazes), or more (Undone by Their Eyes). */
  guard: number;
  /** Stares land twice as hard while she's horny (KP's sight crits). */
  sightCrit: boolean;
  /** Her edicts have taught her See, Hear and Speak No Evil (KP's). */
  seeNoEvil: boolean;
  hearNoEvil: boolean;
  speakNoEvil: boolean;
}

export function noTalkStats(): TalkStats {
  return {
    sense: 0,
    rate: 0,
    stack: {},
    sight: 0,
    gropeButt: 0,
    grope: 0,
    wet: 0,
    come: {},
    horny: 0,
    jerk: 0,
    damage: 0,
    mindDown: 0,
    crit: false,
    known: 0,
    firsts: false,
    aim: false,
    sightSense: 0,
    sightRate: 0,
    sightEvery: {},
    sightEveryPer: {},
    sightSenseBreasts: 0,
    sightGropeButt: 0,
    sightStack: {},
    sightRatePer: 0,
    sightSensePer: 0,
    naked: 0,
    guard: 0,
    sightCrit: false,
    seeNoEvil: false,
    hearNoEvil: false,
    speakNoEvil: false,
  };
}

/** A per-new-talker bonus: `per` for each of them, up to `max`. */
export function perTalker(people: number, per: number, max: number): number {
  return Math.sign(per) * Math.min(Math.abs(max), people * Math.abs(per));
}

/** What one line does to her: desire for the part, and pleasure. `spread` is 0 to 1; `talkLvl` his talk level. */
export function talkGain(o: { talkLvl: number; sense: number; rate: number; jerk: number; spread: number }): { desire: number; pleasure: number } {
  const rate = 1 + o.rate;
  const base = (TALK_DESIRE + o.talkLvl + Math.min(TALK_SPREAD - 1, Math.floor(o.spread * TALK_SPREAD))) * rate;
  // KP: pleasure from the line before watching him stroke it adds to the desire.
  const pleasure = (base + TALK_PLEASURE_BASE * rate) * o.sense * (1 + o.talkLvl * 0.1);
  return { desire: base * (1 + o.jerk), pleasure };
}

/** The passive tier (0 to 3) her count of being talked at about a part has reached. */
export function talkTier(times: number): number {
  return TALK_TIERS.filter((n) => times >= n).length;
}

/** What the room knows of her, for what a foe says about a part of her (KP's line tiers exp0 to exp3). */
export type TalkRep = "innocent" | "plain" | "known" | "notorious";
/** Fame past which the room has heard about her (gossip.ts: "people are starting to talk" from 10). */
export const KNOWN_FAME = 15;
export const NOTORIOUS_FAME = 30;
/** Times she's done it before they call her the town's at it, whatever her fame. */
export const NOTORIOUS_DONE = 20;

/**
 * What the room knows of her about a part. `firsts`: what she's never done is posted (KP's Publish Virgin Status), so
 * they know it whatever her Slut Level says.
 */
export function talkRep(tier: FightTier | undefined, fame: number, done: number, firsts = false): TalkRep {
  if (!tier) return "plain";
  if ((tier === "proper" || firsts) && done === 0) return "innocent";
  if (tier === "lewd" && (fame >= NOTORIOUS_FAME || done >= NOTORIOUS_DONE)) return "notorious";
  if (tier !== "proper" && fame >= KNOWN_FAME) return "known";
  return "plain";
}

/** How often a foe's line comes from what the room knows of her, rather than his own type's. */
export const REP_LINE_SHARE = 0.6;

/** What a foe says about her by what the room knows (`{Name}` is him). Every type uses these, alongside his own. */
export const REP_TALK_LINES: Readonly<Record<Exclude<TalkRep, "plain">, Readonly<Record<LewdPart, readonly string[]>>>> = {
  innocent: {
    mouth: [
      "Never had a cock in that pretty mouth, have you? I can tell.",
      "Bet you don't even know what to do with your tongue yet. I'll teach you.",
      "Lips like that, untouched? What a waste. Let me be the first.",
      "You've never sucked one. You blush just hearing the word.",
      "I'll be the first thing you ever swallow, sweetheart.",
    ],
    breasts: [
      "Nobody's ever had their hands on those, have they? Lucky me.",
      "Look at you, covering up. Never been squeezed in your life.",
      "First hands on those tits are going to be mine.",
      "Bet nobody's even seen them. Show me first.",
      "So proper, so buttoned up. I'd unwrap you like a present.",
    ],
    butt: [
      "That arse has never been touched. I can see it in how you walk.",
      "Prim little backside. Nobody's ever given it a good slap, have they?",
      "I'd be the first to grab that, and you'd never forget me.",
      "Walking about like nobody's ever had a handful. They haven't, have they?",
      "Tight, proper little rear. Begging to be broken in.",
    ],
    pussy: [
      "You've never had a man, have you? It's written all over you.",
      "Still all tight and untouched down there. I'd change that tonight.",
      "Bet you've never even been properly wet for anyone. You will be.",
      "Nobody's ever been inside you. I'll be the one you remember.",
      "Such a good girl. I want to be the one who ruins that.",
    ],
    cock: [
      "Ever even seen one this close? Have a good look.",
      "You've never held a cock, have you? Here's your first lesson.",
      "Don't look away. You're curious. Every good girl is.",
      "Bet you wonder what it feels like. I'll show you.",
      "First time you see one hard for you, and it's mine. Lucky girl.",
    ],
  },
  known: {
    mouth: [
      "Word is you've a mouth on you that'd suck the rust off a gate.",
      "The lads at the mill say you swallow. True, is it?",
      "Heard what you did with that tongue last market day. My turn.",
      "Everyone in the valley's talking about your mouth. Prove 'em right.",
      "They say you can't keep your lips off a cock once you start.",
    ],
    breasts: [
      "Heard you let half the taproom have a squeeze. Where's mine?",
      "Those tits are famous, you know. They sing about them on the pass.",
      "Word is they're even better bare. I want to see if it's true.",
      "My mate said you let him suck on 'em. Lying, was he?",
      "Everyone's had a feel of those but me. Fix that.",
    ],
    butt: [
      "Heard that arse takes a slap like a champion. Turn round.",
      "The whole road's talking about your behind, barmaid.",
      "They say you push it out for anyone who asks nicely. I'm asking.",
      "My cousin said you let him have you from behind. Did you?",
      "That rear's got a reputation. Let me add to it.",
    ],
    pussy: [
      "Heard you get wet the minute a man looks at you. Am I looking hard enough?",
      "Word is you're anybody's after last call. Is it last call yet?",
      "Half the valley says they've had you. I want my turn.",
      "They say you're always dripping by the end of a shift. Show me.",
      "Heard you begged for it last time. Go on, beg.",
    ],
    cock: [
      "Heard you can't say no to a hard cock. Here's one.",
      "Everyone knows you love it. Stop pretending you don't.",
      "Word is you go weak at the knees for one of these. Well?",
      "The lads say you'll take any cock in Tarven. This one's in Tarven.",
      "Heard you stare at laps all night. Stare at mine.",
    ],
  },
  notorious: {
    mouth: [
      "The town's favourite mouth. Open up, it's my go.",
      "That mouth's had more cocks than the inn's had drinks. One more.",
      "You're famous for that throat. Every traveller asks about it.",
      "Don't pretend. You'd suck me right here if I asked. I'm asking.",
      "Everyone's had that mouth. Everyone. Why not me?",
    ],
    breasts: [
      "Those tits belong to the whole valley by now. Hand 'em over.",
      "Half the travellers on the pass come here just for those.",
      "You don't even cover them properly any more. Why bother?",
      "They're on every song and every privy wall from here to Harrowgate.",
      "The town's own pair. Let a man pay his respects.",
    ],
    butt: [
      "That arse is a public house all of its own.",
      "Everyone's had a go round the back. Bend over, it's my turn.",
      "You wiggle it like you're advertising. Business good?",
      "That rear's been ridden more than the post horse.",
      "Come on, town bicycle. Back it up.",
    ],
    pussy: [
      "Tarven's own cunt. Everyone's had a turn, and I'm next.",
      "You're dripping already. You always are. The whole town knows.",
      "How many tonight, eh? Ten? Twenty? Make it one more.",
      "You don't even pretend to say no any more. Lovely.",
      "They say you can't sleep unless you've been filled. Let me tuck you in.",
    ],
    cock: [
      "Cock-mad, the whole valley says. Here, have another.",
      "You can't take your eyes off it. You never could.",
      "You'd crawl across the taproom for this, and everyone knows it.",
      "There's a reason they call you the innkeeper with the open door.",
      "Go on, say it. Say how much you want it. You always do.",
    ],
  },
};

/** What he does as he says it, stroking himself (KP's jerk-off talk). */
export const JERK_TALK_LINES: readonly string[] = [
  "{Name} pulls his cock out and strokes it, staring at you.",
  "{Name} works his cock in his fist as he talks.",
  "{Name} has his hand down his breeches, pumping away.",
  "{Name} strokes himself, slow, so you'll watch.",
  "{Name} jerks his cock at you, breathing hard.",
];
