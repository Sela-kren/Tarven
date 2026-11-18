import type { TouchRegion } from "./touchtalk";
import { cardLines, type FallBeat, type StageCard, type TropeId } from "./tropes";

/**
 * Her mind stage, Karryn-style, from her Lewdness alone (STORY.md section 15, fix 1): corruption is what she does to
 * people, not how far her body has gone, so a cold informant stays where her lewdness puts her.
 * 0 none, 1 warming, 2 eager, 3 filthy.
 */
export const MIND_AT = [20, 54, 107] as const;

export function mindStage(lewdness: number): 0 | 1 | 2 | 3 {
  if (lewdness >= MIND_AT[2]) return 3;
  if (lewdness >= MIND_AT[1]) return 2;
  if (lewdness >= MIND_AT[0]) return 1;
  return 0;
}

export function mindStageName(stage: number): string {
  return ["", "warming", "eager", "filthy"][stage] ?? "";
}

/**
 * Her arc (STORY.md section 4b): the writing layer on top of the mind stage. Sheltered, Curious, Willing, Known,
 * Legend. Willing comes early with three nights shared upstairs (The Back Stairs); Known needs the filthy stage and
 * touches let from four or more kinds of guest, or she still reads as Willing. Legend is the comic fifth stage past
 * Known: it lasts, and it can be come back from (`legendStep`), so it's a saved switch on top of Known, not a number.
 */
export type ArcStage = "sheltered" | "curious" | "willing" | "known" | "legend";
export const ARC_STAGES: readonly ArcStage[] = ["sheltered", "curious", "willing", "known", "legend"];
export const KNOWN_KINDS = 4;

export interface ArcFacts {
  lewdness: number;
  /** She holds The Back Stairs (three nights shared upstairs). */
  backStairs: boolean;
  /** How many kinds of guest she's let touch her, anywhere. */
  kinds: number;
  /** She's a Legend (`legendStep`). It only shows while she'd be Known without it. */
  legend?: boolean;
}

export function arcStage(f: ArcFacts): ArcStage {
  const mind = mindStage(f.lewdness);
  if (mind >= 3) return f.kinds < KNOWN_KINDS ? "willing" : f.legend ? "legend" : "known";
  if (mind === 2 || f.backStairs) return "willing";
  if (mind === 1) return "curious";
  return "sheltered";
}

/** Where a stage sits, 0 (sheltered) to 4 (legend), for comparing. */
export const arcIndex = (stage: ArcStage): number => ARC_STAGES.indexOf(stage);

/** Her own line on the dawn report, the first morning she's a new stage (STORY.md 4b). */
export const ARC_DAWN: Record<ArcStage, string> = {
  sheltered: "(Grandma did this every night? How?)",
  curious: "(I keep thinking about last night. I shouldn't.)",
  willing: "(Good night. Sore feet, full purse, and I didn't hate any of it.)",
  known: "(They'll be back tonight. They always are.)",
  legend: "(They chanted my name till the rafters shook. I took a bow. I wasn't wearing anything to bow in.)",
};

/** At Willing, if she told Tansy her grandmother kept a respectable house (STORY.md 4b). */
export const TANSY_CALLBACK = "(Respectable. I told Tansy that. I believed it.)";

// ---------- The story cards of her fall (CORRUPTION_TROPES.md) ----------

/**
 * The trope that drives each step of her lewdness arc, and its beat (CORRUPTION_TROPES.md, "Her fall"): the setup
 * is the whole arc's trope; Curious is the regulars' conditioning and love bombing; Willing is Pell's photo, the
 * rationalisation and blackmail; Known is the town leaving and one regular staying, isolation and a trauma bond.
 * Legend, past Known, is the doc's mind break played for laughs (with the room's chant as the brainwashing): the
 * aftermath beat, her shame gone so thoroughly she can't remember what it was for.
 */
export const ARC_TROPE: Readonly<Record<ArcStage, { trope: TropeId; also?: TropeId; beat: FallBeat; who: string }>> = {
  sheltered: { trope: "corruption", beat: "setup", who: "the debt" },
  curious: { trope: "conditioning", also: "loveBombing", beat: "erosion", who: "the regulars, the room" },
  willing: { trope: "rationalisation", also: "blackmail", beat: "internalisation", who: "Pell, a photo" },
  known: { trope: "isolation", also: "traumaBond", beat: "break", who: "the town, one regular" },
  legend: { trope: "mindBreak", also: "brainwashing", beat: "aftermath", who: "the room, its chant" },
};

/** Each stage's card: her dawn line first (ARC_DAWN, kept), then the trope's beat in its own voice. */
export const ARC_CARDS: Readonly<Record<ArcStage, StageCard>> = {
  sheltered: {
    id: "arc_sheltered",
    ...ARC_TROPE.sheltered,
    title: "Grandma's house",
    lines: [
      ARC_DAWN.sheltered,
      "The debt's still on the counter where Pell left it, and the soldiers who drank here last night have already told the barracks the new keeper's got tits like a harvest festival.",
      "(A debt I can't pay and a room that stares at my chest. Grandma, what did you leave me?)",
    ],
  },
  curious: {
    id: "arc_curious",
    ...ARC_TROPE.curious,
    title: "Every slip pays",
    lines: [
      ARC_DAWN.curious,
      "Every hand you didn't slap last night came with coin on the bar after it. Three silver for a squeeze, five for not pulling away, and the soldiers' table cheered each time like you'd learned a trick.",
      "(The prettiest thing on the pass, the drunk one kept saying, into my cleavage. Nobody's ever said that to my face. He didn't say it to my face either.)",
    ],
  },
  willing: {
    id: "arc_willing",
    ...ARC_TROPE.willing,
    title: "The photo",
    lines: [
      ARC_DAWN.willing,
      "Pell slides a photo across the bar with his coffee: you, last night, skirt round your waist and somebody's farmhand nose-deep where Mother said nobody goes. \"Everyone saw, love. You wanted it. It's a lovely picture.\"",
      "(I keep trying to remember the part where I said no. All I remember is saying \"there\". Loudly. Twice.)",
    ],
  },
  known: {
    id: "arc_known",
    ...ARC_TROPE.known,
    title: "The ones who stayed",
    lines: [
      ARC_DAWN.known,
      "The farmers' wives have moved their Sunday ale to the Stag, the chapel ladies cross the road, and the baker's boy studies his boots. The only one waiting at opening is the big smuggler who started last night's brawl, then held a cold rag to your lip till close and called you his girl.",
      "(Everyone decent's gone. The one who stayed is the one who gets me in trouble and then out of it. I was always going to end up like this. Grandma did.)",
    ],
  },
  legend: {
    id: "arc_legend",
    ...ARC_TROPE.legend,
    title: "The chant",
    lines: [
      ARC_DAWN.legend,
      "Three wild nights running, and last night the taproom stamped and chanted your name until the tankards walked off the shelves. Somebody wrote a second verse. It rhymes \"Tarven\" with \"carving\" and \"starving\", and then there's a bit about your arse that rhymes with nothing, and they sing it anyway, twice.",
      "(I used to blush. I tried it in the mirror this morning to remember how, and winked at myself instead. Shame? Never heard of her. Did she work here?)",
    ],
  },
};

/** The last line of each card, by the switch: with Consent on, every step was her yes; off, it played by its rules. */
export const ARC_CONSENT: Readonly<Record<ArcStage, { on: string; off: string }>> = {
  sheltered: {
    on: "(Nobody touches me unless I say so. That's the rule. I'm keeping it.)",
    off: "(The hands here don't wait for an answer. I'll have to be quicker with mine.)",
  },
  curious: {
    on: "(Nobody made me. I could have said no every time. I'm counting the times I didn't, and I've run out of fingers.)",
    off: "(Half of them didn't ask. My body answered before I did, and the tips came anyway.)",
  },
  willing: {
    on: "(He can wave his photo all he likes. I said yes to every bit of it, and I'd say it again. That's what scares me.)",
    off: "(Some of it nobody asked. I keep looking at the photo for the part where I minded. I can't find it.)",
  },
  known: {
    on: "(Every one of them asked, and every one of them got a yes. Nobody pushed me here. I walked, in heels, with my tits out.)",
    off: "(They stopped asking a long time ago. I stopped noticing about the same time.)",
  },
  legend: {
    on: "(They still ask, every one, and I still say yes, loudly, with a little curtsey. Stop still works. I just haven't needed it since Tuesday.)",
    off: "(Nobody's asked me anything in a week. Nobody needs to: the whole pass knows the answer and hums it. I still pull away when I want to. I want to less than the song says.)",
  },
};

/**
 * The fifth beat, the morning after her first Known morning: acceptance, in the Fair Madam's voice or (crooked and
 * worse) the Rotten Madam's. A relapse or a way back are for later (CORRUPTION_TROPES.md, "The way back").
 */
export const ARC_AFTERMATH: Readonly<Record<"fair" | "rotten", StageCard>> = {
  fair: {
    id: "arc_aftermath_fair",
    trope: "corruption",
    beat: "aftermath",
    who: "her",
    title: "The Fair Madam",
    lines: [
      "(Wren's bar, Wren's chair, Wren's name in every drunk's mouth. They sing songs about me on the pass now. The songs are filthy and I know all the words.)",
      "The room's yours. You keep the rough ones off the new girls, the coin coming and the ale cold, and nobody leaves without being looked after. Some of them twice.",
    ],
  },
  rotten: {
    id: "arc_aftermath_rotten",
    trope: "corruption",
    also: "traumaBond",
    beat: "aftermath",
    who: "her",
    title: "The Rotten Madam",
    lines: [
      "(The room's mine, and I use it. Every hand, every secret and every cock in this house pays me before it pays anyone.)",
      "The regulars who can't stay away tip the most, and you've learned to hurt them just enough that they come back to be soothed.",
    ],
  },
};

/**
 * Where the dawn has spoken up to: a stage's index (0 to 3), then this (4) once Known's aftermath has been told.
 * Legend isn't counted here: it comes and goes, so its cards are told each time it changes (`legendStep`).
 */
export const ARC_AFTERMATH_SEEN = 4;

/** Her stage as the climb counts it: a Legend is Known underneath. */
const climbStage = (stage: ArcStage): ArcStage => (stage === "legend" ? "known" : stage);

/** What the dawn says of her arc tonight, if anything: a new stage's card, or the aftermath the morning after Known. */
export function arcDawnStep(stage: ArcStage, seen: number, rotten: boolean): { seen: number; card: StageCard; stage: ArcStage | null } | null {
  const s = climbStage(stage);
  const at = arcIndex(s);
  if (at > seen) return { seen: at, card: ARC_CARDS[s], stage: s };
  if (s === "known" && seen === at) return { seen: ARC_AFTERMATH_SEEN, card: ARC_AFTERMATH[rotten ? "rotten" : "fair"], stage: null };
  return null;
}

/** An older save's arc seen: the stage she's at, and at Known the aftermath too, so nothing's announced twice. */
export function arcSeenFor(stage: ArcStage): number {
  return climbStage(stage) === "known" ? ARC_AFTERMATH_SEEN : arcIndex(stage);
}

// ---------- Legend: the lasting comic stage past Known (STORY.md 4b, CORRUPTION_TROPES.md) ----------

/** Lewdness she needs, on top of Known, before the room can make her a Legend. */
export const LEGEND_AT = 160;
/** Touches let in a night that make it a wild one; wild nights in a row (while she could be one) to become one. */
export const LEGEND_WILD = 6;
export const LEGEND_RISE = 3;
/** A quiet night: willpower kept above half all night and no more than this many touches let. Quiet nights in a row to come back. */
export const LEGEND_QUIET_LETS = 1;
export const LEGEND_FALL = 3;

/**
 * Whether she's a Legend, saved: `streak` counts wild nights toward it while she isn't, and quiet nights toward
 * coming back while she is; `rises` and `falls` count each time it changed (each gets its card that dawn).
 */
export interface LegendState {
  on: boolean;
  streak: number;
  rises: number;
  falls: number;
}

export function newLegend(): LegendState {
  return { on: false, streak: 0, rises: 0, falls: 0 };
}

/** A saved Legend state, checked; an older save (or anything broken) has never been one. */
export function readLegend(raw: unknown): LegendState {
  const fresh = newLegend();
  if (!raw || typeof raw !== "object") return fresh;
  const r = raw as Partial<LegendState>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
  return { on: r.on === true, streak: n(r.streak), rises: n(r.rises), falls: n(r.falls) };
}

/** One night, as the Legend reads it: could she be one, was it wild, was it quiet, and did she sit with Oden today. */
export interface LegendNight {
  eligible: boolean;
  wild: boolean;
  quiet: boolean;
  /** A visit to the chapel today counts one more toward coming back (brainwashing is broken by the chapel). */
  chapel?: boolean;
}

/**
 * One dawn of the Legend. Not one: a wild night while she could be one counts up, anything else starts again; at
 * `rise` she's a Legend. One: a quiet night counts up (a chapel day one more), a wild one starts again, and at
 * `fall` (or the moment she couldn't be one) she's back to Known. Only words change with it: nothing here asks or
 * does anything to anyone.
 */
export function legendStep(s: LegendState, n: LegendNight, rise = LEGEND_RISE, fall = LEGEND_FALL): { state: LegendState; change: "rise" | "fall" | null } {
  if (s.on) {
    if (!n.eligible) return { state: { ...s, on: false, streak: 0, falls: s.falls + 1 }, change: "fall" };
    const streak = n.wild ? 0 : s.streak + (n.quiet ? 1 : 0) + (n.chapel ? 1 : 0);
    if (streak >= fall) return { state: { ...s, on: false, streak: 0, falls: s.falls + 1 }, change: "fall" };
    return { state: { ...s, streak }, change: null };
  }
  const streak = n.eligible && n.wild ? s.streak + 1 : 0;
  if (streak >= rise) return { state: { ...s, on: true, streak: 0, rises: s.rises + 1 }, change: "rise" };
  return { state: { ...s, streak }, change: null };
}

/** Her night, for the Legend: `stage` is her stage without it (Known or Legend both count), `lets` tonight's touches let. */
export function herLegendNight(f: { stage: ArcStage; lewdness: number; lets: number; keptWill: boolean; chapel: boolean }): LegendNight {
  return {
    eligible: climbStage(f.stage) === "known" && f.lewdness >= LEGEND_AT,
    wild: f.lets >= LEGEND_WILD,
    quiet: f.keptWill && f.lets <= LEGEND_QUIET_LETS,
    chapel: f.chapel,
  };
}

/** Her second rise and every one after: she came back, and the pass wanted her back. */
export const LEGEND_ENCORE: StageCard = {
  id: "arc_legend_encore",
  ...ARC_TROPE.legend,
  title: "By popular demand",
  lines: [
    "(Back by popular demand. Popular, and very demanding.)",
    "One rowdy night and the chant came back like it never left, the drover with the drum included. Somebody's painted your face on the back of the inn sign. It's flattering. It's mostly your tits.",
    "(I took a few nights off and the whole pass sulked like I'd cancelled the harvest. Fine. FINE. Get the drum.)",
  ],
};

/** Coming back from Legend to Known: the quiet nights, or Oden's bench, and she remembers that it's a choice. */
export const LEGEND_BACK: StageCard = {
  id: "arc_legend_back",
  trope: "mindBreak",
  also: "conditioning",
  beat: "aftermath",
  who: "her, nights off",
  title: "Even legends have nights off",
  lines: [
    "(Quiet nights. Clothes on, willpower up, hands mostly off. The taproom's in mourning.)",
    "The chant's gone back to a mumble. Last night a soldier sang the first verse alone into his ale and nobody joined in, and he cried a bit. You're still Known: the whole pass still knows exactly what you do. You just remember, now, that you choose to.",
    "(Not tonight, lads. Even I have nights off. I'll be back. They know I'll be back. They've kept the drum.)",
  ],
};

/** What the dawn says when the Legend changes: the rise card (the first, or the encore) with her consent line, or the way back. */
export function legendCardLines(change: "rise" | "fall", rises: number, consentOff: boolean): string[] {
  if (change === "fall") return cardLines(LEGEND_BACK);
  return [...cardLines(rises <= 1 ? ARC_CARDS.legend : LEGEND_ENCORE), ARC_CONSENT.legend[consentOff ? "off" : "on"]];
}

/** The lines a card puts on the dawn report: its own, then her stage's consent line, if it's a stage card. */
export function arcCardLines(step: { card: StageCard; stage: ArcStage | null }, consentOff: boolean): string[] {
  const lines = [...step.card.lines];
  if (step.stage) lines.push(ARC_CONSENT[step.stage][consentOff ? "off" : "on"]);
  return lines;
}

/** Her corruption tiers (STORY.md section 8): honest under 40, shady, crooked at 80, rotten at 150. */
export type CorruptionTier = "honest" | "shady" | "crooked" | "rotten";
export const CORRUPTION_TIERS: readonly CorruptionTier[] = ["honest", "shady", "crooked", "rotten"];
export const CORRUPTION_AT = [40, 80, 150] as const;

export function corruptionTier(corruption: number): CorruptionTier {
  if (corruption >= CORRUPTION_AT[2]) return "rotten";
  if (corruption >= CORRUPTION_AT[1]) return "crooked";
  if (corruption >= CORRUPTION_AT[0]) return "shady";
  return "honest";
}

/**
 * Her corruption cards: here she's the one using the tropes (CORRUPTION_TROPES.md, "Her corruption tiers"). Shady,
 * love bombing and rationalisation; Crooked, blackmail, isolation and conditioning; Rotten, gaslighting, a trauma
 * bond and brainwashing. Honest has none: her word is good.
 */
export const CORRUPTION_CARDS: Readonly<Record<Exclude<CorruptionTier, "honest">, StageCard>> = {
  shady: {
    id: "tier_shady",
    trope: "loveBombing",
    also: "rationalisation",
    beat: "erosion",
    who: "her",
    title: "Everyone has a price",
    lines: [
      "You told a corporal he had the best laugh in the garrison, and the biggest hands, and you'd bet the biggest everything, until his purse was empty and his sergeant's was too.",
      "(He'll be back tomorrow to be told again. Everyone has a price. His was being called hung.)",
    ],
  },
  crooked: {
    id: "tier_crooked",
    trope: "blackmail",
    also: "isolation",
    beat: "internalisation",
    who: "her",
    title: "The drawer",
    lines: [
      "The magistrate's love letters to a certain stable lad are in your drawer now, and he'll be paying rent on the drawer. A Velvet House girl asked you about work; you told her Sabine would never take her back. You don't know that. Neither does she.",
      "(Grandma kept a red book. I keep a drawer. It's more practical, and it locks.)",
    ],
  },
  rotten: {
    id: "tier_rotten",
    trope: "gaslighting",
    also: "traumaBond",
    beat: "break",
    who: "her",
    title: "Whose story it is",
    lines: [
      "Jory Bell swears you promised him the cider deal. You didn't. You look him in the eye until he isn't sure, and by noon he's apologising for the misunderstanding and buying a round.",
      "(I was always like this. I just hadn't been paid for it yet.)",
    ],
  },
};

/** Her corruption card tonight, if she's reached a tier past the one the dawn last spoke of (stages only go up). */
export function corruptionDawnStep(corruption: number, seen: number): { seen: number; card: StageCard } | null {
  const tier = corruptionTier(corruption);
  const at = CORRUPTION_TIERS.indexOf(tier);
  if (at <= seen || tier === "honest") return null;
  return { seen: at, card: CORRUPTION_CARDS[tier] };
}

export function arcStageName(stage: ArcStage): string {
  return stage[0].toUpperCase() + stage.slice(1);
}

const BODY_LINES: Record<string, { t: string[][]; d: string[][] }> = {
  mouth: {
    t: [["(Just a kiss...)", "(Their lips...)"], ["(I want their mouth.)", "(Kiss me properly.)"], ["(Fuck my mouth.)", "(Don't stop kissing me.)"]],
    d: [["...soft.", "That's nice."], ["More.", "Again."], ["Harder.", "Use my mouth."]],
  },
  chest: {
    t: [["(My chest...)", "(They're touching me there.)"], ["(Squeeze them.)", "(I like that.)"], ["(Play with my tits.)", "(Harder on my chest.)"]],
    d: [["Careful.", "That's..."], ["Yes, there.", "Don't stop."], ["Squeeze harder.", "My tits..."]],
  },
  pussy: {
    t: [["(Down there...)", "(I shouldn't.)"], ["(Touch me.)", "(I'm getting wet.)"], ["(Fuck, touch my pussy.)", "(I need it inside.)"]],
    d: [["Not there.", "...oh."], ["Right there.", "Don't stop."], ["More. Right on my pussy.", "Fuck yes."]],
  },
  butt: {
    t: [["(My ass...)", "(They grabbed me.)"], ["(Again.)", "(I liked that.)"], ["(Spank me.)", "(Grab my ass harder.)"]],
    d: [["Hey!", "..."], ["Do it again.", "Harder."], ["Spank me.", "Grab it."]],
  },
  body: {
    t: [["(Their hands...)", "(Close.)"], ["(Hold me.)", "(More.)"], ["(Don't let go.)", "(Touch me everywhere.)"]],
    d: [["...", "Okay."], ["Keep going.", "Yes."], ["More.", "Everywhere."]],
  },
};

function bodyKey(region: TouchRegion): string {
  if (region === "intimate" || region === "thigh" || region === "lap") return "pussy";
  if (region === "rear") return "butt";
  if (region === "lips" || region === "face" || region === "neck") return "mouth";
  if (region === "chest") return "chest";
  return "body";
}

/** Direct body-specific line when mind stage is high. */
export function bodyLine(region: TouchRegion, stage: number, isThought: boolean): string {
  const pool = BODY_LINES[bodyKey(region)] ?? BODY_LINES.body;
  const arr = isThought ? pool.t : pool.d;
  const tier = Math.min(2, Math.max(0, stage - 1));
  const list = arr[tier] ?? arr[0];
  return list[Math.floor(Math.random() * list.length)] ?? list[0];
}

/**
 * The asides her stage adds to a touch, in its trope's voice (CORRUPTION_TROPES.md): thoughts come as they reach,
 * before she's answered (so she can still say no), and the spoken ones after a touch she let. Curious keeps its
 * flustered asides and adds the regulars' conditioning and praise; Willing talks itself into it (rationalisation,
 * Pell's photo); Known keeps the body's own words and adds the ones who stayed (isolation, the trauma bond).
 * Thoughts are written without their brackets (they go inside the written thought's); the rest are whole sentences.
 */
export const TOUCH_ASIDES = {
  curious: {
    thought: [
      "I shouldn't want this.",
      "Why does that feel good?",
      "Don't stop.",
      "Last time I let one stay, the whole table tipped.",
      "He keeps calling me gorgeous. I keep letting him.",
      "Every time I don't slap one, the room cheers. I like the cheering. God help me.",
    ],
    said: [
      "\"...don't stop.\"",
      "\"That feels good.\"",
      "The table whistles, and coins hit the bar like applause.",
      "\"Good girl,\" someone calls from the back, and you go hot all the way down.",
    ],
  },
  willing: {
    thought: [
      "Everyone saw me let the last one. Saying no now would just be rude.",
      "Pell's photo says I wanted it. Pell's photo is very clear about it.",
      "Half the garrison's had a feel. Who am I saving it for?",
      "I'd only be lying if I said no. Would I?",
    ],
    said: [
      "You tell yourself you wanted it. You did. That's the annoying part.",
      "Somewhere a phone clicks. You don't even turn round.",
      "\"You asked for this, remember?\" You do. You asked loudly.",
    ],
  },
  known: {
    thought: [
      "(The decent folk drink at the Stag now. These are the ones who stayed. These are mine.)",
      "(He started last night's brawl and then held ice to my lip. Of course I'll let him.)",
      "(Who else would I be? This is who I am. This is who I always was.)",
    ],
    said: ["Nobody else comes in here any more. Just you lot.", "You're the only ones who still look after me.", "I'm yours. You know I am."],
  },
  legend: {
    thought: [
      "(They're chanting again. I'll have to time my moans to the chorus.)",
      "(Is that a hand or a tip? Both. Lovely. Both is my favourite.)",
      "(Shame? Never heard of her. Was she a barmaid here?)",
      "(Grandma had one song about her. I've got three, and one has a dance.)",
    ],
    said: [
      "\"Form a queue, lads. There's plenty to go round, and round, and round.\"",
      "\"Don't be shy! Nobody else is. Least of all me.\"",
      "The room starts up the chant. You conduct it with your free hand.",
      "\"Ten coppers says you can't make me blush. Ha. Pay up.\"",
    ],
  },
} as const;

/** How often Willing adds an aside (the rest, her written line alone), and how often Known speaks for the ones who stayed. */
export const WILLING_ASIDE = 0.5;
export const KNOWN_TROPE = 1 / 3;
/** How often a Legend's aside is the room's chant and her cheek, not the body's own words. */
export const LEGEND_TROPE = 1 / 2;

const pickBy = <T>(list: readonly T[], roll: () => number): T => list[Math.floor(roll() * list.length) % list.length];

/** Puts an aside on the end of a written line: a thought inside the written thought's closing bracket, a sentence after it. */
function addAside(text: string, add: string, isThought: boolean): string {
  if (!isThought) return `${text} ${add}`;
  return text.endsWith(")") ? `${text.slice(0, -1)} ${add})` : `${text} (${add})`;
}

/**
 * Her stage, layered on the touch's own words (STORY.md section 4b): the written line always stays. Sheltered speaks
 * only in the written line (the setup: alarm and counting). Curious, a flustered or conditioned aside; Willing, half
 * the time, the voice talking herself into it; Known, the body's own words after it, or the ones who stayed; Legend,
 * half the time her cheerful cheek and the room's chant, else the body's words with a grin.
 */
export function flavorLine(text: string, stage: ArcStage, region: TouchRegion, isThought: boolean, roll: () => number = Math.random): string {
  if (!text || stage === "sheltered") return text;
  if (stage === "legend") {
    if (roll() < LEGEND_TROPE) return `${text} ${pickBy(TOUCH_ASIDES.legend[isThought ? "thought" : "said"], roll)}`;
    const body = bodyLine(region, 3, isThought);
    return isThought ? `${text} ${body}` : `${text} You grin, "${body}"`;
  }
  if (stage === "known") {
    const body = roll() < KNOWN_TROPE ? pickBy(TOUCH_ASIDES.known[isThought ? "thought" : "said"], roll) : bodyLine(region, 3, isThought);
    return isThought ? `${text} ${body}` : `${text} You breathe, "${body}"`;
  }
  if (stage === "willing" && roll() >= WILLING_ASIDE) return text;
  return addAside(text, pickBy(TOUCH_ASIDES[stage][isThought ? "thought" : "said"], roll), isThought);
}

export function wildSensitivity(name: string, delta: number, lewdness: number, brothel: boolean): string {
  const stage = mindStage(lewdness);
  let note = "";
  if (stage >= 3) note = " (filthy — you need more)";
  else if (stage >= 2) note = " (the wanton in you loves it)";
  else if (stage >= 1) note = " (warming up)";
  else if (delta >= 8) note = " (getting sensitive)";
  else if (delta >= 4) note = " (warming up)";
  return `${name} sensitivity +${Math.round(delta)}${note}${brothel ? " [Brothel]" : ""}`;
}
