/**
 * Passives, after the way Karryn's Prison does them: everything she lets happen, and everything she does, is
 * counted in her records; when a record crosses a line she earns a passive, which changes how she plays from
 * then on, often with a cost alongside the benefit. Passives are earned as she goes to bed, and take hold from
 * the next night.
 *
 * Desire is five meters, one for each part of her (body, mouth, breasts, butt, pussy). They fill during a night
 * as she lets guests touch her and as she drinks, and empty by morning; a touch can only be let happen once its
 * meter is high enough. Passives raise where the meters start, lower what touches need, and make them fill
 * faster. Lewdness isn't raised directly: it's worked out from her passives and her records, like Karryn's slut
 * level. Corruption is how far she's sold out.
 *
 * Every count here only rises when she says yes, or (for composure and sadism) when she says no. She can
 * always say no.
 */
import { CUM_SPOTS, type CumSpot } from "./cum";
import { GUEST_KIND_LIST } from "./guestroles";
import type { GuestKind } from "./tavern";
import type { TouchRegion } from "./touchtalk";
import type { SkillId, StatId } from "./skills";
import type { DuelMove } from "./duel";

/**
 * Her desires. `cock` is her wanting to be intimate with someone: it fills when the bold touches land (a lap, a
 * hand between her thighs, an invitation), and it's what the invitation upstairs needs.
 */
export type Meter = "body" | "mouth" | "breasts" | "butt" | "pussy" | "cock";
export const METERS: readonly Meter[] = ["body", "mouth", "breasts", "butt", "pussy", "cock"];
export const METER_NAMES: Record<Meter, string> = { body: "Body", mouth: "Mouth", breasts: "Breasts", butt: "Butt", pussy: "Pussy", cock: "Cock" };
/** Touches that stir her wanting to be intimate, on top of their own meter. */
export const INTIMATE_REGIONS: ReadonlySet<TouchRegion> = new Set(["thigh", "lap", "intimate", "invite"]);
export const METER_MAX = 100;
export type Meters = Record<Meter, number>;

/** Which meter a touch on each part of her fills, and needs. */
export const METER_OF: Record<TouchRegion, Meter> = {
  hand: "body",
  hair: "body",
  shoulder: "body",
  neck: "body",
  waist: "body",
  clothes: "body",
  face: "mouth",
  lips: "mouth",
  chest: "breasts",
  rear: "butt",
  thigh: "pussy",
  lap: "pussy",
  intimate: "pussy",
  // Going upstairs with someone is wanting to be intimate with them.
  invite: "cock",
};

export function emptyMeters(): Meters {
  return { body: 0, mouth: 0, breasts: 0, butt: 0, pussy: 0, cock: 0 };
}

/** What happens upstairs, once she's taken a guest up. Each is a placeholder 18+ card for now. */
export type UpstairsAct = "kiss" | "hands" | "mouth" | "bed" | "behind";
export const UPSTAIRS_ACTS: readonly UpstairsAct[] = ["kiss", "hands", "mouth", "bed", "behind"];

/**
 * Each thing she can do upstairs: its choice, the one line its card shows (never more than that), the meter
 * she has to be warm enough on to choose it, and what the guest leaves on the pillow.
 */
export const UPSTAIRS: Record<UpstairsAct, { label: string; line: string; meter: Meter; need: number; gold: number; wet?: boolean }> = {
  kiss: {
    label: "Kiss and hold each other",
    line: "The door shuts behind you. For a long while there's only the two of you, and the candle.",
    meter: "mouth",
    need: 0,
    gold: 8,
  },
  hands: {
    label: "Use your hands on them",
    line: "You take your time with them, and learn exactly what they like.",
    // What she does with her own hands and mouth takes Cock desire (desire.ts).
    meter: "cock",
    need: 40,
    gold: 12,
  },
  mouth: {
    label: "Use your mouth on them",
    line: "You sink to your knees, and for a while the little room is very quiet.",
    meter: "cock",
    need: 60,
    gold: 16,
  },
  bed: {
    label: "Take them to bed",
    line: "The bed creaks. The candle gutters out. Neither of you notices.",
    meter: "pussy",
    need: 80,
    gold: 20,
    // Pussy desire isn't enough on its own: she has to be wet too.
    wet: true,
  },
  behind: {
    label: "Let them take you from behind",
    line: "You lean on the bedpost and look back at them over your shoulder.",
    meter: "butt",
    need: 60,
    gold: 20,
  },
};

/** Everything counted about her, for passives to read. Only ever goes up. */
export interface Records {
  /** Which kinds of guest have been let touch each part of her. */
  kinds: Partial<Record<TouchRegion, GuestKind[]>>;
  leans: number;
  pulled: number;
  slapped: number;
  /** Rough touches she let happen: a smack, being carried off, a tie pulled with teeth. */
  rough: number;
  /**
   * The Consent-off check (touchsettings.ts): times their push won and she gave in (her sub side, toward
   * masochism), and times her hold stood and she mocked them for trying (her dom side, toward sadism).
   */
  subWins: number;
  domWins: number;
  /** Clothing reaches she turned away (pulled away from or slapped): she kept it on. */
  clothesKept: number;
  /** Brawls: grapples of hers that landed, theirs that landed on her, and times they had hold of her. */
  grapplesLanded: number;
  grapplesTaken: number;
  timesHeld: number;
  /** A foe's reach mid-brawl: slapped away, or let happen (her choice, on the touch screen). */
  brawlSlaps: number;
  brawlLets: number;
  /** Guests who grabbed her as she served them (grab.ts), how often she broke their hold, and how often she let it stand. */
  grabbed: number;
  grabsBroken: number;
  grabsAllowed: number;
  /** Guests who paid for a look at her (show.ts): a peek inside her clothes, a proper look, and the times she said no. */
  peeks: number;
  flashes: number;
  showsRefused: number;
  /** Times the garrison raided the tavern in the night (heat at its most). */
  raids: number;
  /** Bar work: pots of stew cooked through, messes cleaned up, nights with nobody walking out, busy nights. */
  stewsCooked: number;
  messesCleaned: number;
  smoothNights: number;
  busyNights: number;
  /** Nights each meter reached the top. */
  maxed: Partial<Record<Meter, number>>;
  /** Nights every meter reached 60. */
  allHigh: number;
  clothesLost: number;
  /** Nights that ended with every piece she'd lose gone. */
  bareNights: number;
  invitations: number;
  upstairsKinds: GuestKind[];
  /**
   * Invitations she answered by staying down in the taproom (taproom.ts): how many times, how many partners in
   * all (the one who asked counts), and the most at once.
   */
  taproomScenes: number;
  taproomPartners: number;
  taproomMost: number;
  acts: Partial<Record<UpstairsAct, number>>;
  overwhelmed: number;
  /** Times she came in an after-hours game (each one counts toward her lewdness). */
  climaxes: number;
  /** Nights she eased the ache herself before sleep. */
  alone: number;
  served: number;
  poured: number;
  washed: number;
  /** Nights with no touch let happen, and nights ending with high respect. */
  chasteNights: number;
  respectNights: number;
  /** Brawls: won, lost, and talked down; dodges that worked; and gossip overheard. */
  fightsWon: number;
  fightsLost: number;
  talkedDown: number;
  dodges: number;
  rumors: number;
  /** After-hours duels: won, lost, called off; won on the edge, won without once holding back. */
  duelsWon: number;
  duelsLost: number;
  duelsStopped: number;
  edgeWins: number;
  boldWins: number;
  /** Times she held back, and undressed, in a duel; and each move she made. */
  heldBack: number;
  undressed: number;
  duelMoves: Partial<Record<DuelMove, number>>;
  /** Every load a man has left on or in her, in ml by where it landed, and how many loads in all. */
  cum: Partial<Record<CumSpot, number>>;
  loads: number;
}

export function newRecords(): Records {
  return {
    kinds: {},
    leans: 0,
    pulled: 0,
    slapped: 0,
    rough: 0,
    subWins: 0,
    domWins: 0,
    clothesKept: 0,
    grapplesLanded: 0,
    grapplesTaken: 0,
    timesHeld: 0,
    brawlSlaps: 0,
    brawlLets: 0,
    grabbed: 0,
    grabsBroken: 0,
    grabsAllowed: 0,
    peeks: 0,
    flashes: 0,
    showsRefused: 0,
    raids: 0,
    stewsCooked: 0,
    messesCleaned: 0,
    smoothNights: 0,
    busyNights: 0,
    maxed: {},
    allHigh: 0,
    clothesLost: 0,
    bareNights: 0,
    invitations: 0,
    upstairsKinds: [],
    taproomScenes: 0,
    taproomPartners: 0,
    taproomMost: 0,
    acts: {},
    overwhelmed: 0,
    climaxes: 0,
    alone: 0,
    served: 0,
    poured: 0,
    washed: 0,
    chasteNights: 0,
    respectNights: 0,
    fightsWon: 0,
    fightsLost: 0,
    talkedDown: 0,
    dodges: 0,
    rumors: 0,
    duelsWon: 0,
    duelsLost: 0,
    duelsStopped: 0,
    edgeWins: 0,
    boldWins: 0,
    heldBack: 0,
    undressed: 0,
    duelMoves: {},
    cum: {},
    loads: 0,
  };
}

/** Touches that count as rough, for masochism. */
export const ROUGH_TOUCHES: ReadonlySet<string> = new Set([
  "smack",
  "grab",
  "carry",
  "teeth",
  "bothHands",
  "holdLap",
  "wall",
  "scuffleSpank",
  "scuffleGrope",
  "scuffleChest",
  "scuffleKiss",
]);

// ---------- Effects ----------

/** What all her passives add up to. Every field starts at nothing. */
export interface Effects {
  /** Where each meter starts each night. */
  start: Meters;
  /** How much less each kind of touch needs, in meter points (10 is one step of boldness). */
  ease: Partial<Record<TouchRegion, number>>;
  /** How much faster each meter fills, as a fraction: 0.25 is a quarter faster. */
  sens: Meters;
  /** Extra gold when she lets each kind of touch happen. */
  touchGold: Partial<Record<TouchRegion, number>>;
  /** How much more often guests go for each kind of touch, as a fraction. */
  pull: Partial<Record<TouchRegion, number>>;
  /** Every touch she lets happen adds this to every meter, and this much more to Pussy. */
  spill: number;
  spillPussy: number;
  leanGold: number;
  /** Meter points shaved off what leaning in needs over letting it happen. */
  leanMargin: number;
  leanMeters: number;
  /** Extra added to every meter by each drink. */
  drinkMeters: number;
  /** How much slower drink gets to her, as a fraction. */
  drunkRate: number;
  /** How much longer guests wait, as a fraction. */
  patience: number;
  /** Extra gold on every tipped serve, and on everything, as a fraction. */
  serveTip: number;
  payPct: number;
  bottleGold: number;
  /** How much more often guests ask for a bottle. */
  bottleAsk: number;
  /** How much more (or, negative, less) often guests reach for her, as a fraction. */
  reach: number;
  /** How much more (or, negative, less) often guests grab her as she serves them (grab.ts), as a fraction. */
  grab: number;
  /** Gold she gets each time she lets a guest who grabbed her hold her. */
  grabGold: number;
  /** How much more often guests offer coin for a look at her, as a fraction; and the extra gold each look earns. */
  showAsk: number;
  showGold: number;
  /** Added to every guest's nerve. */
  nerve: number;
  /** Extra gold and fame on each serve while she's lost a piece of clothing. */
  strippedGold: number;
  strippedFame: number;
  /** Respect for pulling away; for a slap: respect, fame, a lift to her Body meter, and what it does to them. */
  pullRespect: number;
  slapRespect: number;
  slapFame: number;
  slapMeters: number;
  slapStops: boolean;
  slapCalm: boolean;
  /** Added to every meter by each rough touch she lets happen. */
  roughMeters: number;
  /** How much faster pleasure builds, as a fraction; and what being overwhelmed adds to every meter. */
  pleasure: number;
  overwhelmBoost: number;
  /** More gold from taking someone upstairs, as a fraction, and heat for it each time. */
  upstairsGold: number;
  upstairsHeat: number;
  /** Added to every meter's start the night after she eased the ache herself. */
  aloneStart: number;
  /** Selling, telling and keeping secrets at last call. */
  secretGold: number;
  informHeat: number;
  informTrust: number;
  protectTrust: number;
  protectHeat: number;
  /** What happens to trust, heat and respect every night. */
  perNight: { trust: number; heat: number; respect: number };
  /** Levels given outright to stats and skills. */
  skill: Partial<Record<StatId | SkillId, number>>;
  /** In a fight: extra damage, and extra chance to dodge, talk them down and stare them down. */
  fightDamage: number;
  fightDodge: number;
  fightTalk: number;
  fightStare: number;
  /** How much less often trouble starts, as a fraction. */
  trouble: number;
  /**
   * In an after-hours duel: how much harder her moves land, how much less their moves do to her, extra stamina,
   * more gold for a win, how much better Hold Back works, extra on the edge, and extra for each step undressed.
   */
  duelPower: number;
  duelResist: number;
  duelStamina: number;
  duelGold: number;
  duelHold: number;
  duelEdge: number;
  duelUndress: number;
  /** Extra willpower at the top (see willpower.ts). */
  willMax: number;
  /**
   * Her hold in the Consent-off check (touchsettings.ts), Karryn's resistances: added to it everywhere, and for each
   * kind of touch. Negative is weaker: touches get past her more easily.
   */
  hold: number;
  holdOf: Partial<Record<TouchRegion, number>>;
  /** In a brawl: extra chance her grapples land; less hurt from theirs; how much of being held she shrugs off. */
  grappleHit: number;
  grappleGuard: number;
  heldEase: number;
  /** In a brawl: extra damage when she slaps away a reach; how much likelier a foe reaches instead of swinging. */
  brawlSlap: number;
  brawlReach: number;
  /** In a brawl: how much less her desire gets in her way, as a fraction. */
  fightDesire: number;
  /** Bar work: how much faster the stew cooks, how much longer it keeps before burning, and how much less a messy room wears on guests, as fractions. */
  cookSpeed: number;
  burnGrace: number;
  tidy: number;
  /** How much less willpower saying no costs her, as a fraction. */
  refuseEase: number;
}

export function noEffects(): Effects {
  return {
    start: emptyMeters(),
    ease: {},
    sens: emptyMeters(),
    touchGold: {},
    pull: {},
    spill: 0,
    spillPussy: 0,
    leanGold: 0,
    leanMargin: 0,
    leanMeters: 0,
    drinkMeters: 0,
    drunkRate: 0,
    patience: 0,
    serveTip: 0,
    payPct: 0,
    bottleGold: 0,
    bottleAsk: 0,
    reach: 0,
    grab: 0,
    grabGold: 0,
    showAsk: 0,
    showGold: 0,
    nerve: 0,
    strippedGold: 0,
    strippedFame: 0,
    pullRespect: 0,
    slapRespect: 0,
    slapFame: 0,
    slapMeters: 0,
    slapStops: false,
    slapCalm: false,
    roughMeters: 0,
    pleasure: 0,
    overwhelmBoost: 0,
    upstairsGold: 0,
    upstairsHeat: 0,
    aloneStart: 0,
    secretGold: 0,
    informHeat: 0,
    informTrust: 0,
    protectTrust: 0,
    protectHeat: 0,
    perNight: { trust: 0, heat: 0, respect: 0 },
    skill: {},
    fightDamage: 0,
    fightDodge: 0,
    fightTalk: 0,
    fightStare: 0,
    trouble: 0,
    duelPower: 0,
    duelResist: 0,
    duelStamina: 0,
    duelGold: 0,
    duelHold: 0,
    duelEdge: 0,
    duelUndress: 0,
    willMax: 0,
    hold: 0,
    holdOf: {},
    grappleHit: 0,
    grappleGuard: 0,
    heldEase: 0,
    brawlSlap: 0,
    brawlReach: 0,
    fightDesire: 0,
    cookSpeed: 0,
    burnGrace: 0,
    tidy: 0,
    refuseEase: 0,
  };
}

const add = <K extends string>(map: Partial<Record<K, number>>, keys: readonly K[], n: number) => {
  for (const key of keys) map[key] = (map[key] ?? 0) + n;
};
const startAll = (e: Effects, n: number) => METERS.forEach((m) => (e.start[m] += n));
const sensAll = (e: Effects, n: number) => METERS.forEach((m) => (e.sens[m] += n));

// ---------- The facts passives read ----------

export interface PassiveFacts {
  records: Records;
  lets: Partial<Record<TouchRegion, number>>;
  drinks: number;
  sold: number;
  informed: number;
  protected: number;
  fame: number;
  trust: number;
  trustMax: number;
  lewdness: number;
  corruption: number;
  /** Her stat levels. */
  levels: Record<StatId, number>;
  /** Her Level (all her stats and skills together) and her Slut Level (lewdness by tens). */
  herLevel: number;
  slutLevel: number;
}

const lets = (f: PassiveFacts, ...regions: TouchRegion[]) => regions.reduce((sum, r) => sum + (f.lets[r] ?? 0), 0);
const kindsOf = (f: PassiveFacts, ...regions: TouchRegion[]) => new Set(regions.flatMap((r) => f.records.kinds[r] ?? [])).size;
const acts = (f: PassiveFacts, ...which: UpstairsAct[]) => which.reduce((sum, a) => sum + (f.records.acts[a] ?? 0), 0);
const maxed = (f: PassiveFacts, meter: Meter) => f.records.maxed[meter] ?? 0;
/**
 * Her two sides, Karryn's Masochism and Sadism levels: what counts toward each (rough touches she let happen and
 * giving in with Consent off; slaps and facing them down), and how far one runs ahead of the other.
 */
const subSide = (f: PassiveFacts) => f.records.rough + f.records.subWins;
const domSide = (f: PassiveFacts) => f.records.slapped + f.records.domWins;
const subLead = (f: PassiveFacts) => Math.max(0, subSide(f) - domSide(f));
const domLead = (f: PassiveFacts) => Math.max(0, domSide(f) - subSide(f));
/** Adds the same to her hold for each kind of touch given. */
const holdFor = (e: Effects, n: number, ...regions: TouchRegion[]) => {
  for (const r of regions) e.holdOf[r] = (e.holdOf[r] ?? 0) + n;
};
/** Adds the same gold to each kind of touch given. */
const goldFor = (e: Effects, n: number, ...regions: TouchRegion[]) => {
  for (const r of regions) e.touchGold[r] = (e.touchGold[r] ?? 0) + n;
};
const EVERY_TOUCH: readonly TouchRegion[] = ["hand", "face", "hair", "shoulder", "waist", "rear", "chest", "lap", "lips", "neck", "thigh", "clothes", "intimate"];

// ---------- The passives ----------

export type PassiveGroup =
  | "hands"
  | "mouth"
  | "neck"
  | "breasts"
  | "hips"
  | "butt"
  | "thighs"
  | "pussy"
  | "cock"
  | "exhibition"
  | "invitations"
  | "masturbation"
  | "sadism"
  | "masochism"
  | "desire"
  | "leaning"
  | "drink"
  | "bar"
  | "composure"
  | "corruption"
  | "village"
  | "fame"
  | "brawler"
  | "charm"
  | "mind"
  | "afterHours";

/** The groups in the order the journal shows them; the body's first, then everything else. */
export const PASSIVE_GROUPS: readonly { id: PassiveGroup; name: string; body: boolean }[] = [
  { id: "hands", name: "Hands", body: true },
  { id: "mouth", name: "Mouth", body: true },
  { id: "neck", name: "Neck & Hair", body: true },
  { id: "breasts", name: "Breasts", body: true },
  { id: "hips", name: "Hips", body: true },
  { id: "butt", name: "Butt", body: true },
  { id: "thighs", name: "Thighs & Lap", body: true },
  { id: "pussy", name: "Pussy", body: true },
  { id: "cock", name: "Cock", body: true },
  { id: "exhibition", name: "Exhibition", body: true },
  { id: "invitations", name: "Invitations", body: true },
  { id: "masturbation", name: "Masturbation", body: true },
  { id: "sadism", name: "Sadism", body: false },
  { id: "masochism", name: "Masochism", body: false },
  { id: "desire", name: "Desire", body: false },
  { id: "leaning", name: "Leaning In", body: false },
  { id: "drink", name: "Drink", body: false },
  { id: "bar", name: "Bar Work", body: false },
  { id: "composure", name: "Composure", body: false },
  { id: "corruption", name: "Corruption", body: false },
  { id: "village", name: "Village", body: false },
  { id: "fame", name: "Fame", body: false },
  { id: "brawler", name: "Brawler", body: false },
  { id: "charm", name: "Charm", body: false },
  { id: "mind", name: "Mind", body: false },
  { id: "afterHours", name: "After Hours", body: false },
];

export interface PassiveDef {
  id: string;
  name: string;
  group: PassiveGroup;
  /** What earns it, in words, and how far along she is: [have, need]. */
  need: string;
  progress: (f: PassiveFacts) => [number, number];
  /** Anything else it needs besides the count. */
  also?: (f: PassiveFacts) => boolean;
  benefit: string;
  cost?: string;
  effect: (e: Effects) => void;
  /** Lewd points toward her lewdness, and corruption added once when it's earned. */
  lewd?: number;
  corruption?: number;
  /** What she thinks as she earns it, lying in bed. */
  thought: string;
}

const count = (n: number, need: number): [number, number] => [Math.min(n, need), need];

export const PASSIVES: readonly PassiveDef[] = [
  // ---- Hands ----
  {
    id: "warmHands",
    name: "Warm Hands",
    group: "hands",
    need: "Let guests hold your hand 3 times",
    progress: (f) => count(lets(f, "hand"), 3),
    benefit: "Body desire starts each night at +5",
    effect: (e) => (e.start.body += 5),
    lewd: 2,
    thought: "(I keep thinking about their hands. Warm, rough, careful.)",
  },
  {
    id: "handInHand",
    name: "Hand in Hand",
    group: "hands",
    need: "Let guests hold your hand 10 times, from 3 kinds of guest",
    progress: (f) => count(lets(f, "hand"), 10),
    also: (f) => kindsOf(f, "hand") >= 3,
    benefit: "Hand touches need 10 less desire; Body desire fills 15% faster",
    effect: (e) => {
      add(e.ease, ["hand"], 10);
      e.sens.body += 0.15;
    },
    lewd: 4,
    thought: "(Anyone's hand, now. I like them all.)",
  },
  {
    id: "fondOfBeingHeld",
    name: "Fond of Being Held",
    group: "hands",
    need: "Let guests hold your hand 25 times",
    progress: (f) => count(lets(f, "hand"), 25),
    benefit: "+2 gold for every hand touch you allow",
    cost: "Guests reach for your hands more",
    effect: (e) => {
      add(e.touchGold, ["hand"], 2);
      add(e.pull, ["hand"], 0.5);
    },
    lewd: 6,
    thought: "(I hold my hand out without meaning to now.)",
  },

  // ---- Mouth ----
  {
    id: "softCheeks",
    name: "Soft Cheeks",
    group: "mouth",
    need: "Let guests touch your face 3 times",
    progress: (f) => count(lets(f, "face"), 3),
    benefit: "Mouth desire starts each night at +5",
    effect: (e) => (e.start.mouth += 5),
    lewd: 2,
    thought: "(My cheeks go hot just remembering it.)",
  },
  {
    id: "stolenKiss",
    name: "Stolen Kiss",
    group: "mouth",
    need: "Let a guest kiss you",
    progress: (f) => count(lets(f, "lips"), 1),
    benefit: "Kisses need 10 less desire",
    effect: (e) => add(e.ease, ["lips"], 10),
    lewd: 4,
    thought: "(My first kiss. I keep touching my lips.)",
  },
  {
    id: "sweetLips",
    name: "Sweet Lips",
    group: "mouth",
    need: "Let guests kiss you 10 times",
    progress: (f) => count(lets(f, "lips"), 10),
    benefit: "Mouth desire fills 25% faster; +2 gold a kiss",
    effect: (e) => {
      e.sens.mouth += 0.25;
      add(e.touchGold, ["lips"], 2);
    },
    lewd: 6,
    thought: "(I'm getting good at it. They tell me so.)",
  },
  {
    id: "kissHungry",
    name: "Kiss-Hungry",
    group: "mouth",
    need: "Let guests kiss you 25 times, and max your Mouth desire on 3 nights",
    progress: (f) => count(lets(f, "lips"), 25),
    also: (f) => maxed(f, "mouth") >= 3,
    benefit: "Mouth desire starts each night at +15",
    cost: "Guests go for your mouth more",
    effect: (e) => {
      e.start.mouth += 15;
      add(e.pull, ["lips", "face"], 0.5);
    },
    lewd: 10,
    thought: "(I want to be kissed. All the time. Is that wrong?)",
  },
  {
    id: "practisedMouth",
    name: "Practised Mouth",
    group: "mouth",
    need: "Use your mouth upstairs 5 times",
    progress: (f) => count(acts(f, "mouth", "kiss"), 5),
    benefit: "Mouth desire fills 25% more",
    effect: (e) => (e.sens.mouth += 0.25),
    lewd: 8,
    thought: "(I know what I'm doing now. Mostly.)",
  },

  // ---- Neck & Hair ----
  {
    id: "easyShoulders",
    name: "Easy Shoulders",
    group: "neck",
    need: "Let guests put an arm round you 5 times",
    progress: (f) => count(lets(f, "shoulder"), 5),
    benefit: "Body desire starts each night at +5",
    effect: (e) => (e.start.body += 5),
    lewd: 2,
    thought: "(Being held close isn't so frightening.)",
  },
  {
    id: "weakAtTheNeck",
    name: "Weak at the Neck",
    group: "neck",
    need: "Let guests touch or kiss your neck 5 times",
    progress: (f) => count(lets(f, "neck"), 5),
    benefit: "Neck touches need 10 less desire; Body desire fills 20% faster",
    effect: (e) => {
      add(e.ease, ["neck"], 10);
      e.sens.body += 0.2;
    },
    lewd: 4,
    thought: "(Anyone who finds my neck can do anything with me.)",
  },
  {
    id: "meltsAtATouch",
    name: "Melts at a Touch",
    group: "neck",
    need: "Let guests touch your neck, hair and shoulders 30 times",
    progress: (f) => count(lets(f, "neck", "hair", "shoulder"), 30),
    benefit: "Every touch you allow adds +2 to every desire",
    effect: (e) => (e.spill += 2),
    lewd: 6,
    thought: "(One touch and I'm warm all over.)",
  },

  // ---- Breasts ----
  {
    id: "flushed",
    name: "Flushed",
    group: "breasts",
    need: "Let a guest touch your chest",
    progress: (f) => count(lets(f, "chest"), 1),
    benefit: "Breasts desire starts each night at +5",
    effect: (e) => (e.start.breasts += 5),
    lewd: 3,
    thought: "(They touched me there. And I let them.)",
  },
  {
    id: "proudChest",
    name: "Proud Chest",
    group: "breasts",
    need: "Let guests touch your chest 8 times",
    progress: (f) => count(lets(f, "chest"), 8),
    benefit: "Chest touches need 10 less desire; +3 gold each",
    effect: (e) => {
      add(e.ease, ["chest"], 10);
      add(e.touchGold, ["chest"], 3);
    },
    lewd: 6,
    thought: "(I stand up straighter now. I know they're looking.)",
  },
  {
    id: "shamelessBust",
    name: "Shameless Bust",
    group: "breasts",
    need: "Let guests touch your chest 20 times, from all 4 kinds of guest",
    progress: (f) => count(lets(f, "chest"), 20),
    also: (f) => kindsOf(f, "chest") >= 4,
    benefit: "Breasts desire starts each night at +15, and fills 20% faster",
    cost: "-1 respect every night",
    effect: (e) => {
      e.start.breasts += 15;
      e.sens.breasts += 0.2;
      e.perNight.respect -= 1;
    },
    lewd: 10,
    thought: "(Let them look. Let them touch. I like it.)",
  },

  // ---- Hips ----
  {
    id: "easyWaist",
    name: "Easy Waist",
    group: "hips",
    need: "Let guests hold your waist 5 times",
    progress: (f) => count(lets(f, "waist"), 5),
    benefit: "Body desire starts each night at +5",
    effect: (e) => (e.start.body += 5),
    lewd: 2,
    thought: "(A hand on my waist feels like it belongs there.)",
  },
  {
    id: "swayingHips",
    name: "Swaying Hips",
    group: "hips",
    need: "Let guests hold your waist 15 times",
    progress: (f) => count(lets(f, "waist"), 15),
    benefit: "Waist touches need 10 less desire; +1 gold on tipped serves",
    effect: (e) => {
      add(e.ease, ["waist"], 10);
      e.serveTip += 1;
    },
    lewd: 4,
    thought: "(I've started walking differently between the tables.)",
  },
  {
    id: "hipsThatAsk",
    name: "Hips That Ask",
    group: "hips",
    need: "Let guests hold your waist 35 times",
    progress: (f) => count(lets(f, "waist"), 35),
    benefit: "Body desire fills 30% faster",
    cost: "Guests are bolder (+1 nerve)",
    effect: (e) => {
      e.sens.body += 0.3;
      e.nerve += 1;
    },
    lewd: 6,
    thought: "(They can tell. Everyone can tell what I want.)",
  },

  // ---- Butt ----
  {
    id: "cheeky",
    name: "Cheeky",
    group: "butt",
    need: "Let a guest touch your rear",
    progress: (f) => count(lets(f, "rear"), 1),
    benefit: "Butt desire starts each night at +5",
    effect: (e) => (e.start.butt += 5),
    lewd: 3,
    thought: "(The cheek of them! ...I didn't stop them.)",
  },
  {
    id: "pinchable",
    name: "Pinchable",
    group: "butt",
    need: "Let guests touch your rear 8 times",
    progress: (f) => count(lets(f, "rear"), 8),
    benefit: "Rear touches need 10 less desire; +2 gold each",
    effect: (e) => {
      add(e.ease, ["rear"], 10);
      add(e.touchGold, ["rear"], 2);
    },
    lewd: 6,
    thought: "(I bend over the tables a little slower than I need to.)",
  },
  {
    id: "admiredFromBehind",
    name: "Admired From Behind",
    group: "butt",
    need: "Let guests touch your rear 20 times",
    progress: (f) => count(lets(f, "rear"), 20),
    benefit: "Butt desire starts each night at +15",
    cost: "Guests go for your rear more",
    effect: (e) => {
      e.start.butt += 15;
      add(e.pull, ["rear"], 0.5);
    },
    lewd: 10,
    thought: "(I can feel their eyes on me every time I turn round.)",
  },
  {
    id: "fromBehind",
    name: "Taken From Behind",
    group: "butt",
    need: "Be taken from behind upstairs 3 times",
    progress: (f) => count(acts(f, "behind"), 3),
    benefit: "Butt desire fills 30% faster",
    effect: (e) => (e.sens.butt += 0.3),
    lewd: 10,
    thought: "(I never imagined. Now I can't stop imagining.)",
  },

  // ---- Thighs & Lap ----
  {
    id: "perched",
    name: "Perched",
    group: "thighs",
    need: "Sit on a guest's lap",
    progress: (f) => count(lets(f, "lap"), 1),
    benefit: "Pussy desire starts each night at +5",
    effect: (e) => (e.start.pussy += 5),
    lewd: 3,
    thought: "(I sat on someone's lap. In front of everyone.)",
  },
  {
    id: "lapWarmer",
    name: "Lap Warmer",
    group: "thighs",
    need: "Let guests have your lap or thighs 8 times",
    progress: (f) => count(lets(f, "lap", "thigh"), 8),
    benefit: "Lap and thigh touches need 10 less desire; Pussy desire fills 20% faster",
    effect: (e) => {
      add(e.ease, ["lap", "thigh"], 10);
      e.sens.pussy += 0.2;
    },
    lewd: 6,
    thought: "(Best seat in the house. Theirs, I mean. Mine too.)",
  },
  {
    id: "wanderingHands",
    name: "Wandering Hands Welcome",
    group: "thighs",
    need: "Let guests have your lap or thighs 20 times",
    progress: (f) => count(lets(f, "lap", "thigh"), 20),
    benefit: "+3 gold for every lap or thigh touch",
    cost: "-1 respect every night",
    effect: (e) => {
      add(e.touchGold, ["lap", "thigh"], 3);
      e.perNight.respect -= 1;
    },
    lewd: 10,
    thought: "(Higher. I keep thinking it. Higher.)",
  },

  // ---- Pussy ----
  {
    id: "curiousHeat",
    name: "Curious Heat",
    group: "pussy",
    need: "Max your Pussy desire on a night",
    progress: (f) => count(maxed(f, "pussy"), 1),
    benefit: "Pussy desire starts each night at +5",
    effect: (e) => (e.start.pussy += 5),
    lewd: 3,
    thought: "(I ache. I didn't know you could ache like this.)",
  },
  {
    id: "underTheTable",
    name: "Under the Table",
    group: "pussy",
    need: "Let a guest touch you there",
    progress: (f) => count(lets(f, "intimate"), 1),
    benefit: "Intimate touches need 10 less desire",
    effect: (e) => add(e.ease, ["intimate"], 10),
    lewd: 8,
    thought: "(Under the table. With the whole room right there.)",
  },
  {
    id: "aching",
    name: "Aching",
    group: "pussy",
    need: "Let guests touch you there 10 times",
    progress: (f) => count(lets(f, "intimate"), 10),
    benefit: "Pussy desire fills 30% faster, and every touch you allow adds +2 to it",
    effect: (e) => {
      e.sens.pussy += 0.3;
      e.spillPussy += 2;
    },
    lewd: 10,
    thought: "(Every touch, anywhere, and I feel it there.)",
  },
  {
    id: "firstNight",
    name: "First Night",
    group: "pussy",
    need: "Take a guest to bed upstairs",
    progress: (f) => count(acts(f, "bed"), 1),
    benefit: "All desire starts each night at +3",
    effect: (e) => startAll(e, 3),
    lewd: 10,
    thought: "(So that's what it's like. I want to again.)",
  },
  {
    id: "unashamedHeat",
    name: "Unashamed Heat",
    group: "pussy",
    need: "Let guests touch you there 25 times, and max your Pussy desire on 5 nights",
    progress: (f) => count(lets(f, "intimate"), 25),
    also: (f) => maxed(f, "pussy") >= 5,
    benefit: "Pussy desire starts each night at +20",
    cost: "Guests are bolder (+1 nerve)",
    effect: (e) => {
      e.start.pussy += 20;
      e.nerve += 1;
    },
    lewd: 14,
    thought: "(I'm not ashamed any more. Of any of it.)",
  },

  // ---- Cock ----
  {
    id: "curiousHands",
    name: "Curious Hands",
    group: "cock",
    need: "Use your hands on a guest upstairs",
    progress: (f) => count(acts(f, "hands"), 1),
    benefit: "Body and Cock desire start each night at +5",
    effect: (e) => {
      e.start.body += 5;
      e.start.cock += 5;
    },
    lewd: 6,
    thought: "(I did that. With my own hands.)",
  },
  {
    id: "skilledHands",
    name: "Skilled Hands",
    group: "cock",
    need: "Use your hands on guests upstairs 5 times",
    progress: (f) => count(acts(f, "hands"), 5),
    benefit: "+20% gold from taking guests upstairs",
    effect: (e) => (e.upstairsGold += 0.2),
    lewd: 8,
    thought: "(I know exactly what they like now.)",
  },
  {
    id: "eagerMouth",
    name: "Eager Mouth",
    group: "cock",
    need: "Use your mouth on a guest upstairs",
    progress: (f) => count(acts(f, "mouth"), 1),
    benefit: "Mouth and Cock desire start each night at +5",
    effect: (e) => {
      e.start.mouth += 5;
      e.start.cock += 5;
    },
    lewd: 8,
    thought: "(I didn't think I'd ever... and then I wanted to.)",
  },
  {
    id: "cockHungry",
    name: "Cock-Hungry",
    group: "cock",
    need: "Use your hands or mouth upstairs 15 times, with 3 kinds of guest",
    progress: (f) => count(acts(f, "hands", "mouth"), 15),
    also: (f) => f.records.upstairsKinds.length >= 3,
    benefit: "+30% gold from taking guests upstairs; all desire fills 10% faster",
    cost: "Guests are bolder (+1 nerve)",
    effect: (e) => {
      e.upstairsGold += 0.3;
      sensAll(e, 0.1);
      e.nerve += 1;
    },
    lewd: 14,
    thought: "(I look at them across the bar and think about upstairs.)",
  },

  // ---- Exhibition ----
  {
    id: "peepShow",
    name: "Peep Show",
    group: "exhibition",
    need: "Let 5 guests peek inside your clothes",
    progress: (f) => count(f.records.peeks, 5),
    benefit: "+1 gold for every look you give; guests ask for one 25% more often",
    effect: (e) => {
      e.showGold += 1;
      e.showAsk += 0.25;
    },
    lewd: 2,
    thought: "(A tug at my neckline and the coins come out. Easiest money in the house.)",
  },
  {
    id: "flasher",
    name: "Flasher",
    group: "exhibition",
    need: "Show 5 guests your body bare",
    progress: (f) => count(f.records.flashes, 5),
    benefit: "+2 gold for every look you give; guests ask for one 50% more often",
    effect: (e) => {
      e.showGold += 2;
      e.showAsk += 0.5;
    },
    lewd: 5,
    thought: "(The whole room went quiet when I did it. I keep thinking about that quiet.)",
  },
  {
    id: "heldFast",
    name: "Held Fast",
    group: "exhibition",
    need: "Let 6 guests who grab you at the table hold you",
    progress: (f) => count(f.records.grabsAllowed, 6),
    benefit: "+2 gold each time you let a guest hold you",
    cost: "Guests grab you 25% more often",
    effect: (e) => {
      e.grabGold += 2;
      e.grab += 0.25;
    },
    lewd: 2,
    thought: "(Their hand on my wrist, the whole room watching. I didn't pull away.)",
  },
  {
    id: "bareShoulders",
    name: "Bare Shoulders",
    group: "exhibition",
    need: "Lose a piece of clothing to a guest",
    progress: (f) => count(f.records.clothesLost, 1),
    benefit: "+1 gold on every serve while you've lost a piece",
    effect: (e) => (e.strippedGold += 1),
    lewd: 2,
    thought: "(I worked half the night like that. Nobody minded.)",
  },
  {
    id: "showOff",
    name: "Show-Off",
    group: "exhibition",
    need: "Lose 10 pieces of clothing to guests",
    progress: (f) => count(f.records.clothesLost, 10),
    benefit: "Stripping touches need 10 less desire; +1 fame a serve while undressed",
    effect: (e) => {
      add(e.ease, ["clothes"], 10);
      e.strippedFame += 1;
    },
    lewd: 5,
    thought: "(I like it when they look. There, I said it.)",
  },
  {
    id: "exhibitionist",
    name: "Exhibitionist",
    group: "exhibition",
    need: "End 3 nights down to your underthings",
    progress: (f) => count(f.records.bareNights, 3),
    benefit: "Body desire starts each night at +10; +2 more gold a serve while undressed",
    cost: "+1 heat every night: word gets back to the baron",
    effect: (e) => {
      e.start.body += 10;
      e.strippedGold += 2;
      e.perNight.heat += 1;
    },
    lewd: 10,
    thought: "(The whole pass knows what the innkeeper looks like. Good.)",
  },
  // Answering an invitation in the taproom instead of upstairs (taproom.ts): the room as her audience.
  {
    id: "openHouse",
    name: "Open House",
    group: "exhibition",
    need: "Answer an invitation by staying down in the taproom",
    progress: (f) => count(f.records.taproomScenes, 1),
    benefit: "+20% gold from invitations, upstairs or down; guests ask for a look 25% more often",
    effect: (e) => {
      e.upstairsGold += 0.2;
      e.showAsk += 0.25;
    },
    lewd: 8,
    thought: "(I didn't go upstairs. I didn't want a door between us and the room.)",
  },
  {
    id: "wholeRoom",
    name: "The Whole Room",
    group: "exhibition",
    need: "Stay down in the taproom 3 times, once with 4 at once",
    progress: (f) => count(f.records.taproomScenes, 3),
    also: (f) => f.records.taproomMost >= 4,
    benefit: "Body desire starts each night at +10; +1 fame a serve while undressed",
    cost: "-1 respect every night: the room remembers",
    effect: (e) => {
      e.start.body += 10;
      e.strippedFame += 1;
      e.perNight.respect -= 1;
    },
    lewd: 14,
    thought: "(Half the room was in it and the other half watched. I'd do it again.)",
  },

  // ---- Invitations ----
  {
    id: "upstairsCurious",
    name: "Upstairs Curious",
    group: "invitations",
    need: "Take a guest upstairs",
    progress: (f) => count(f.records.invitations, 1),
    benefit: "All desire starts each night at +3",
    effect: (e) => startAll(e, 3),
    lewd: 6,
    thought: "(I took someone upstairs. Me.)",
  },
  {
    id: "backStairs",
    name: "The Back Stairs",
    group: "invitations",
    need: "Take guests upstairs 3 times",
    progress: (f) => count(f.records.invitations, 3),
    benefit: "Invitations need 10 less desire; +20% gold from taking guests upstairs",
    effect: (e) => {
      add(e.ease, ["invite"], 10);
      e.upstairsGold += 0.2;
    },
    lewd: 10,
    thought: "(The stairs creak in the same places every time now.)",
  },
  {
    id: "mistressUpstairs",
    name: "Mistress of the Upstairs Room",
    group: "invitations",
    need: "Take guests upstairs 10 times, all 4 kinds of guest",
    progress: (f) => count(f.records.invitations, 10),
    also: (f) => f.records.upstairsKinds.length >= 4,
    benefit: "+50% gold from taking guests upstairs",
    cost: "+1 heat each time: the baron hears",
    effect: (e) => {
      e.upstairsGold += 0.5;
      e.upstairsHeat += 1;
    },
    lewd: 15,
    thought: "(Half the pass has been up those stairs. With me.)",
  },

  // ---- Masturbation ----
  {
    id: "restlessHands",
    name: "Restless Hands",
    group: "masturbation",
    need: "Ease the ache yourself before sleep",
    progress: (f) => count(f.records.alone, 1),
    benefit: "Body desire fills 10% faster",
    effect: (e) => (e.sens.body += 0.1),
    lewd: 3,
    thought: "(I couldn't sleep until I... I couldn't sleep.)",
  },
  {
    id: "knowsWhatSheLikes",
    name: "Knows What She Likes",
    group: "masturbation",
    need: "Ease the ache yourself on 5 nights",
    progress: (f) => count(f.records.alone, 5),
    benefit: "Intimate touches need 10 less desire; Pussy desire starts at +10",
    effect: (e) => {
      add(e.ease, ["intimate"], 10);
      e.start.pussy += 10;
    },
    lewd: 6,
    thought: "(I know exactly what I like now. I could tell them.)",
  },
  {
    id: "nightlyRitual",
    name: "Nightly Ritual",
    group: "masturbation",
    need: "Ease the ache yourself on 12 nights",
    progress: (f) => count(f.records.alone, 12),
    benefit: "The night after you ease the ache, all desire starts +10",
    effect: (e) => (e.aloneStart += 10),
    lewd: 8,
    thought: "(Every night. It's the only way I sleep.)",
  },

  // ---- Sadism ----
  {
    id: "firmHand",
    name: "Firm Hand",
    group: "sadism",
    need: "Slap 5 guests who got too free (or face them down with Consent off)",
    progress: (f) => count(f.records.slapped + f.records.domWins, 5),
    benefit: "A guest you slap won't reach for you again that night; +1 respect a slap",
    effect: (e) => {
      e.slapStops = true;
      e.slapRespect += 1;
    },
    thought: "(They learn fast, with a stinging hand.)",
  },
  {
    id: "sharpPalm",
    name: "Sharp Palm",
    group: "sadism",
    need: "Slap or face down 15 guests",
    progress: (f) => count(f.records.slapped + f.records.domWins, 15),
    benefit: "The room loves a good slap: +2 fame each",
    effect: (e) => (e.slapFame += 2),
    thought: "(The whole room cheers when I do it now.)",
  },
  {
    id: "enjoysIt",
    name: "Enjoys It",
    group: "sadism",
    need: "Slap or face down 30 guests, with lewdness 20 or more",
    progress: (f) => count(f.records.slapped + f.records.domWins, 30),
    also: (f) => f.lewdness >= 20,
    benefit: "A slap adds +5 to your Body desire",
    cost: "Slapped guests sulk all the more",
    effect: (e) => (e.slapMeters += 5),
    lewd: 6,
    thought: "(The look on their face. I like it more than I should.)",
  },
  {
    id: "mistressOfTheBar",
    name: "Mistress of the Bar",
    group: "sadism",
    need: "Slap or face down 60 guests",
    progress: (f) => count(f.records.slapped + f.records.domWins, 60),
    benefit: "Slaps don't anger guests: they come back for more",
    effect: (e) => (e.slapCalm = true),
    lewd: 4,
    thought: "(Some of them only reach for me to get slapped.)",
  },

  // ---- Masochism ----
  {
    id: "stingingCheeks",
    name: "Stinging Cheeks",
    group: "masochism",
    need: "Let guests get rough with you (or give in to them with Consent off) 3 times",
    progress: (f) => count(f.records.rough + f.records.subWins, 3),
    benefit: "Butt desire fills 20% faster",
    effect: (e) => (e.sens.butt += 0.2),
    lewd: 4,
    thought: "(It stung. I didn't mind. Why didn't I mind?)",
  },
  {
    id: "likesItRough",
    name: "Likes It Rough",
    group: "masochism",
    need: "Let guests get rough with you (or give in to them with Consent off) 10 times",
    progress: (f) => count(f.records.rough + f.records.subWins, 10),
    benefit: "Every rough touch you allow adds +5 to every desire",
    cost: "Guests are bolder (+1 nerve)",
    effect: (e) => {
      e.roughMeters += 5;
      e.nerve += 1;
    },
    lewd: 8,
    thought: "(Gentle's nice. Rough is better.)",
  },
  {
    id: "toughLove",
    name: "Tough Love",
    group: "masochism",
    need: "Let guests get rough with you (or give in to them with Consent off) 25 times",
    progress: (f) => count(f.records.rough + f.records.subWins, 25),
    benefit: "Pleasure builds 25% faster",
    effect: (e) => (e.pleasure += 0.25),
    lewd: 10,
    thought: "(Hold me tighter. Harder. Don't stop.)",
  },

  // ---- Desire ----
  {
    id: "restless",
    name: "Restless",
    group: "desire",
    need: "Max any desire on a night",
    progress: (f) => count(Math.max(0, ...Object.values(f.records.maxed).map((n) => n ?? 0)), 1),
    benefit: "All desire starts each night at +5",
    effect: (e) => startAll(e, 5),
    lewd: 3,
    thought: "(I can't stop thinking about tonight.)",
  },
  {
    id: "daydreamer",
    name: "Daydreamer",
    group: "desire",
    need: "Reach lewdness 25",
    progress: (f) => count(f.lewdness, 25),
    benefit: "All desire fills 10% faster",
    effect: (e) => sensAll(e, 0.1),
    thought: "(I catch myself staring at the door, waiting for the evening.)",
  },
  {
    id: "alwaysWanting",
    name: "Always Wanting",
    group: "desire",
    need: "Have every desire at 60 on the same night",
    progress: (f) => count(f.records.allHigh, 1),
    benefit: "All desire starts each night at +10",
    cost: "Guests are bolder (+1 nerve)",
    effect: (e) => {
      startAll(e, 10);
      e.nerve += 1;
    },
    lewd: 8,
    thought: "(All of me wants. All of it, all at once.)",
  },
  {
    id: "overwhelmedOnce",
    name: "Overwhelmed",
    group: "desire",
    need: "Be overwhelmed by pleasure",
    progress: (f) => count(f.records.overwhelmed, 1),
    benefit: "Pleasure builds 15% faster",
    effect: (e) => (e.pleasure += 0.15),
    lewd: 6,
    thought: "(In the middle of the bar. In front of everyone.)",
  },
  {
    id: "insatiable",
    name: "Insatiable",
    group: "desire",
    need: "Be overwhelmed by pleasure 5 times",
    progress: (f) => count(f.records.overwhelmed, 5),
    benefit: "Being overwhelmed adds +10 more to every desire",
    effect: (e) => (e.overwhelmBoost += 10),
    lewd: 12,
    thought: "(Once is never enough. Not any more.)",
  },

  // ---- Leaning in ----
  {
    id: "leansIn",
    name: "Leans In",
    group: "leaning",
    need: "Lean into a guest's touch 5 times",
    progress: (f) => count(f.records.leans, 5),
    benefit: "+1 gold every time you lean in",
    effect: (e) => (e.leanGold += 1),
    lewd: 2,
    thought: "(Not just letting them. Wanting them to.)",
  },
  {
    id: "eager",
    name: "Eager",
    group: "leaning",
    need: "Lean in 15 times",
    progress: (f) => count(f.records.leans, 15),
    benefit: "Leaning in needs 10 less desire over letting it happen",
    effect: (e) => (e.leanMargin += 10),
    lewd: 4,
    thought: "(I meet them halfway now. More than halfway.)",
  },
  {
    id: "wantsItMore",
    name: "Wants It More",
    group: "leaning",
    need: "Lean in 40 times",
    progress: (f) => count(f.records.leans, 40),
    benefit: "Leaning in adds +5 to every desire",
    effect: (e) => (e.leanMeters += 5),
    lewd: 6,
    thought: "(More. Always more.)",
  },

  // ---- Drink ----
  {
    id: "socialDrinker",
    name: "Social Drinker",
    group: "drink",
    need: "Drink with guests 5 times",
    progress: (f) => count(f.drinks, 5),
    benefit: "Each drink adds +2 more to every desire",
    effect: (e) => (e.drinkMeters += 2),
    thought: "(A drink with the guests is good for business. And for me.)",
  },
  {
    id: "lightHeaded",
    name: "Light-Headed",
    group: "drink",
    need: "Drink with guests 15 times",
    progress: (f) => count(f.drinks, 15),
    benefit: "Each drink adds +3 more to every desire",
    effect: (e) => (e.drinkMeters += 3),
    lewd: 2,
    thought: "(After two cups I stop minding where their hands go.)",
  },
  {
    id: "ironLiver",
    name: "Iron Liver",
    group: "drink",
    need: "Drink with guests 30 times",
    progress: (f) => count(f.drinks, 30),
    benefit: "Drink gets to you 25% slower",
    effect: (e) => (e.drunkRate += 0.25),
    thought: "(I can drink a soldier under the table now.)",
  },
  {
    id: "bottomless",
    name: "Bottomless",
    group: "drink",
    need: "Drink with guests 60 times",
    progress: (f) => count(f.drinks, 60),
    benefit: "Drink gets to you 25% slower still; +1 gold on tipped serves",
    effect: (e) => {
      e.drunkRate += 0.25;
      e.serveTip += 1;
    },
    thought: "(They buy me drinks just to watch me drink them.)",
  },

  // ---- Bar work ----
  {
    id: "steadyTray",
    name: "Steady Tray",
    group: "bar",
    need: "Serve 25 orders",
    progress: (f) => count(f.records.served, 25),
    benefit: "Guests wait 10% longer",
    effect: (e) => (e.patience += 0.1),
    thought: "(I can carry four cups without spilling now.)",
  },
  {
    id: "quickHands",
    name: "Quick Hands",
    group: "bar",
    need: "Serve 75 orders",
    progress: (f) => count(f.records.served, 75),
    benefit: "Guests wait 10% longer still",
    effect: (e) => (e.patience += 0.1),
    thought: "(Nobody waits long at my bar.)",
  },
  {
    id: "regularsFavourite",
    name: "Regulars' Favourite",
    group: "bar",
    need: "Serve 150 orders",
    progress: (f) => count(f.records.served, 150),
    benefit: "+1 gold on tipped serves",
    effect: (e) => (e.serveTip += 1),
    thought: "(They ask for me by name.)",
  },
  {
    id: "barmaidOfThePass",
    name: "Barmaid of the Pass",
    group: "bar",
    need: "Serve 300 orders",
    progress: (f) => count(f.records.served, 300),
    benefit: "+10% on all pay",
    effect: (e) => (e.payPct += 0.1),
    thought: "(Best barmaid on the pass. Everyone says so.)",
  },
  {
    id: "goodStuff",
    name: "Good Stuff",
    group: "bar",
    need: "Pour 10 bottled drinks",
    progress: (f) => count(f.records.poured, 10),
    benefit: "+1 gold a bottled drink",
    effect: (e) => (e.bottleGold += 1),
    thought: "(I know a good bottle when I pour one.)",
  },
  {
    id: "sommelier",
    name: "Sommelier",
    group: "bar",
    need: "Pour 40 bottled drinks",
    progress: (f) => count(f.records.poured, 40),
    benefit: "Guests ask for the good stuff more often",
    effect: (e) => (e.bottleAsk += 0.2),
    thought: "(I talk them into the wine every time.)",
  },
  {
    id: "cleanHands",
    name: "Clean Hands",
    group: "bar",
    need: "Wash 50 cups and dishes",
    progress: (f) => count(f.records.washed, 50),
    benefit: "Guests wait 10% longer: everything they're served on shines",
    effect: (e) => (e.patience += 0.1),
    thought: "(Scrub, rinse, stack. I could do it asleep.)",
  },

  // ---- Composure ----
  {
    id: "coldShoulder",
    name: "Cold Shoulder",
    group: "composure",
    need: "Pull away from 5 guests",
    progress: (f) => count(f.records.pulled, 5),
    benefit: "+1 respect every time you pull away; +5 willpower",
    effect: (e) => {
      e.pullRespect += 1;
      e.willMax += 5;
    },
    thought: "(Not tonight. Not unless I say so.)",
  },
  {
    id: "untouchable",
    name: "Untouchable",
    group: "composure",
    need: "Turn away 30 guests",
    progress: (f) => count(f.records.pulled + f.records.slapped, 30),
    benefit: "Guests reach for you 30% less often",
    cost: "Fewer chances at touch tips",
    effect: (e) => (e.reach -= 0.3),
    thought: "(They know better than to try now.)",
  },
  {
    id: "ladyOfTheHouse",
    name: "Lady of the House",
    group: "composure",
    need: "Get through 3 nights without letting anyone touch you",
    progress: (f) => count(f.records.chasteNights, 3),
    benefit: "+1 trust every night",
    effect: (e) => (e.perNight.trust += 1),
    thought: "(The village sees an innkeeper they can trust.)",
  },
  {
    id: "ironWill",
    name: "Iron Will",
    group: "composure",
    need: "End 3 nights with respect 8 or more",
    progress: (f) => count(f.records.respectNights, 3),
    benefit: "Guests are less bold (-1 nerve); +10 willpower",
    effect: (e) => {
      e.nerve -= 1;
      e.willMax += 10;
    },
    thought: "(They mind themselves around me.)",
  },

  // ---- Corruption ----
  {
    id: "looseLips",
    name: "Loose Lips",
    group: "corruption",
    need: "Sell a secret",
    progress: (f) => count(f.sold, 1),
    benefit: "+3 gold for every secret you sell",
    cost: "+5 corruption",
    effect: (e) => (e.secretGold += 3),
    corruption: 5,
    thought: "(Everyone has a price. Even their secrets.)",
  },
  {
    id: "secretBroker",
    name: "Secret Broker",
    group: "corruption",
    need: "Sell 4 secrets",
    progress: (f) => count(f.sold, 4),
    benefit: "+5 more gold for every secret you sell",
    cost: "+10 corruption",
    effect: (e) => (e.secretGold += 5),
    corruption: 10,
    thought: "(I listen at every table now. It all pays.)",
  },
  {
    id: "baronsEar",
    name: "Baron's Ear",
    group: "corruption",
    need: "Tell the baron's men what you heard, twice",
    progress: (f) => count(f.informed, 2),
    benefit: "-1 heat every time you inform",
    cost: "-1 trust every time you inform",
    effect: (e) => {
      e.informHeat += 1;
      e.informTrust += 1;
    },
    corruption: 5,
    thought: "(The baron's men nod to me in the street now.)",
  },
  {
    id: "baronsPet",
    name: "Baron's Pet",
    group: "corruption",
    need: "Inform 5 times",
    progress: (f) => count(f.informed, 5),
    benefit: "-1 heat every night",
    cost: "-1 trust every night",
    effect: (e) => {
      e.perNight.heat -= 1;
      e.perNight.trust -= 1;
    },
    corruption: 10,
    thought: "(The village goes quiet when I walk past.)",
  },
  {
    id: "coldHeart",
    name: "Cold Heart",
    group: "corruption",
    need: "Reach corruption 50",
    progress: (f) => count(f.corruption, 50),
    benefit: "+10% on all pay",
    cost: "-1 respect every night",
    effect: (e) => {
      e.payPct += 0.1;
      e.perNight.respect -= 1;
    },
    thought: "(Coin is coin. I've stopped asking where it comes from.)",
  },

  // ---- Village ----
  {
    id: "keeperOfSecrets",
    name: "Keeper of Secrets",
    group: "village",
    need: "Keep a secret from the baron's men",
    progress: (f) => count(f.protected, 1),
    benefit: "+1 trust every time you keep one",
    effect: (e) => (e.protectTrust += 1),
    thought: "(What's said in my tavern stays in my tavern.)",
  },
  {
    id: "safeHarbour",
    name: "Safe Harbour",
    group: "village",
    need: "Keep 4 secrets",
    progress: (f) => count(f.protected, 4),
    benefit: "+1 more trust every time you keep one",
    cost: "+1 heat every time you keep one",
    effect: (e) => {
      e.protectTrust += 1;
      e.protectHeat += 1;
    },
    thought: "(Everyone running from the baron finds their way here.)",
  },
  {
    id: "heartOfTheVillage",
    name: "Heart of the Village",
    group: "village",
    need: "Reach trust 12",
    progress: (f) => count(f.trust, 12),
    benefit: "Guests wait 15% longer",
    effect: (e) => (e.patience += 0.15),
    thought: "(Tarven's mine, and I'm Tarven's.)",
  },

  // ---- Fame ----
  {
    id: "knownFace",
    name: "Known Face",
    group: "fame",
    need: "Reach fame 20",
    progress: (f) => count(f.fame, 20),
    benefit: "Guests wait 5% longer",
    effect: (e) => (e.patience += 0.05),
    thought: "(People nod to me on the road.)",
  },
  {
    id: "localFavourite",
    name: "Local Favourite",
    group: "fame",
    need: "Reach fame 50",
    progress: (f) => count(f.fame, 50),
    benefit: "+1 gold on tipped serves",
    effect: (e) => (e.serveTip += 1),
    thought: "(They come up the pass just to see me.)",
  },
  {
    id: "talkOfThePass",
    name: "Talk of the Pass",
    group: "fame",
    need: "Reach fame 80",
    progress: (f) => count(f.fame, 80),
    benefit: "+2 gold on tipped serves",
    cost: "Guests are bolder (+1 nerve)",
    effect: (e) => {
      e.serveTip += 2;
      e.nerve += 1;
    },
    thought: "(Every tavern on the pass talks about me.)",
  },

  // ---- Brawler ----
  {
    id: "bouncer",
    name: "Bouncer",
    group: "brawler",
    need: "Win a brawl",
    progress: (f) => count(f.records.fightsWon, 1),
    benefit: "+1 Strength level",
    effect: (e) => add(e.skill, ["strength"], 1),
    thought: "(Out the door, and don't come back.)",
  },
  {
    id: "lightOnHerFeet",
    name: "Light on Her Feet",
    group: "brawler",
    need: "Dodge 8 blows",
    progress: (f) => count(f.records.dodges, 8),
    benefit: "+10% to dodge; +1 Agility level",
    effect: (e) => {
      e.fightDodge += 0.1;
      add(e.skill, ["agility"], 1);
    },
    thought: "(They can't hit what isn't there.)",
  },
  {
    id: "takesAPunch",
    name: "Takes a Punch",
    group: "brawler",
    need: "Lose 3 brawls",
    progress: (f) => count(f.records.fightsLost, 3),
    benefit: "+1 Endurance level",
    effect: (e) => add(e.skill, ["endurance"], 1),
    thought: "(Knocked down three times. Got up three times.)",
  },
  {
    id: "heavyHand",
    name: "Heavy Hand",
    group: "brawler",
    need: "Win 5 brawls",
    progress: (f) => count(f.records.fightsWon, 5),
    benefit: "+2 damage in a fight",
    effect: (e) => (e.fightDamage += 2),
    thought: "(I hit like a smith now.)",
  },
  {
    id: "noTroubleHere",
    name: "Nobody Starts Trouble Here",
    group: "brawler",
    need: "Win 12 brawls",
    progress: (f) => count(f.records.fightsWon, 12),
    benefit: "Trouble starts half as often",
    effect: (e) => (e.trouble += 0.5),
    thought: "(Word's got round. They behave in my tavern.)",
  },

  // ---- Charm ----
  {
    id: "winningSmile",
    name: "Winning Smile",
    group: "charm",
    need: "Reach Charm level 3",
    progress: (f) => count(f.levels.charm, 3),
    benefit: "+10% to talk a fight down",
    effect: (e) => (e.fightTalk += 0.1),
    thought: "(One smile and they forget what they were angry about.)",
  },
  {
    id: "silverTongue",
    name: "Silver Tongue",
    group: "charm",
    need: "Talk 5 brawls down",
    progress: (f) => count(f.records.talkedDown, 5),
    benefit: "+15% to talk a fight down; +1 Charm level",
    effect: (e) => {
      e.fightTalk += 0.15;
      add(e.skill, ["charm"], 1);
    },
    thought: "(Words work better than fists. Usually.)",
  },
  {
    id: "belleOfTheTavern",
    name: "Belle of the Tavern",
    group: "charm",
    need: "Reach Charm level 6",
    progress: (f) => count(f.levels.charm, 6),
    benefit: "+1 gold on tipped serves",
    cost: "Guests reach for you more often",
    effect: (e) => {
      e.serveTip += 1;
      e.reach += 0.15;
    },
    lewd: 2,
    thought: "(Every eye in the room follows me. I like it.)",
  },

  // ---- Mind ----
  {
    id: "sharpEars",
    name: "Sharp Ears",
    group: "mind",
    need: "Overhear gossip 4 times",
    progress: (f) => count(f.records.rumors, 4),
    benefit: "+1 Mind level",
    effect: (e) => add(e.skill, ["mind"], 1),
    thought: "(I hear everything in this room. Everything.)",
  },
  {
    id: "coolHead",
    name: "Cool Head",
    group: "mind",
    need: "Reach Mind level 3",
    progress: (f) => count(f.levels.mind, 3),
    benefit: "+10% to stare a fight down",
    effect: (e) => (e.fightStare += 0.1),
    thought: "(Nothing rattles me any more.)",
  },
  {
    id: "steelNerves",
    name: "Steel Nerves",
    group: "mind",
    need: "Reach Mind level 6",
    progress: (f) => count(f.levels.mind, 6),
    benefit: "Guests are less bold (-1 nerve)",
    effect: (e) => (e.nerve -= 1),
    thought: "(They look at me and think twice.)",
  },

  // ---- After Hours ----
  {
    id: "nightOwl",
    name: "Night Owl",
    group: "afterHours",
    need: "Play an after-hours game to the end",
    progress: (f) => count(f.records.duelsWon + f.records.duelsLost, 1),
    benefit: "+5 stamina in after-hours games",
    effect: (e) => (e.duelStamina += 5),
    lewd: 3,
    thought: "(The tavern's quieter after closing. I like it that way.)",
  },
  {
    id: "goodSport",
    name: "Good Sport",
    group: "afterHours",
    need: "Lose 3 after-hours games",
    progress: (f) => count(f.records.duelsLost, 3),
    benefit: "Their moves do 10% less to you",
    effect: (e) => (e.duelResist += 0.1),
    lewd: 2,
    thought: "(Losing isn't so bad. Not the way I lose.)",
  },
  {
    id: "houseChampion",
    name: "House Champion",
    group: "afterHours",
    need: "Win 5 after-hours games",
    progress: (f) => count(f.records.duelsWon, 5),
    benefit: "A win pays 50% more",
    effect: (e) => (e.duelGold += 0.5),
    lewd: 3,
    thought: "(Word's got round. They line up to lose to me.)",
  },
  {
    id: "queenOfTheNight",
    name: "Queen of the Night",
    group: "afterHours",
    need: "Win 12 after-hours games",
    progress: (f) => count(f.records.duelsWon, 12),
    benefit: "Your moves land 15% harder",
    effect: (e) => (e.duelPower += 0.15),
    lewd: 5,
    thought: "(Nobody in Tarven lasts against me.)",
  },
  {
    id: "neverHoldsBack",
    name: "Never Holds Back",
    group: "afterHours",
    need: "Win 3 after-hours games without once holding back",
    progress: (f) => count(f.records.boldWins, 3),
    benefit: "Your moves land 10% harder",
    cost: "Holding back works 30% less",
    effect: (e) => {
      e.duelPower += 0.1;
      e.duelHold -= 0.3;
    },
    lewd: 4,
    thought: "(Why hold back? I win anyway.)",
  },
  {
    id: "coolAsIce",
    name: "Cool as Ice",
    group: "afterHours",
    need: "Hold back 20 times",
    progress: (f) => count(f.records.heldBack, 20),
    benefit: "Holding back works 50% better; their moves do 10% less to you; +5 willpower",
    effect: (e) => {
      e.duelHold += 0.5;
      e.duelResist += 0.1;
      e.willMax += 5;
    },
    thought: "(Slow down, breathe, and let them come undone first.)",
  },
  {
    id: "edgeWalker",
    name: "Edge Walker",
    group: "afterHours",
    need: "Win 3 games while on the edge",
    progress: (f) => count(f.records.edgeWins, 3),
    benefit: "On the edge, your moves land 25% harder",
    effect: (e) => (e.duelEdge += 0.25),
    lewd: 3,
    thought: "(I'm at my best right on the brink.)",
  },
  {
    id: "bareAndBold",
    name: "Bare and Bold",
    group: "afterHours",
    need: "Undress 5 times in after-hours games",
    progress: (f) => count(f.records.undressed, 5),
    benefit: "+1 Exhibition level; each step undressed adds 10% more to your moves",
    effect: (e) => (e.duelUndress += 0.1),
    lewd: 3,
    thought: "(The way they look at me when the dress comes off.)",
  },
  {
    id: "cleverFingers",
    name: "Clever Fingers",
    group: "afterHours",
    need: "Use your hands 10 times in after-hours games",
    progress: (f) => count(f.records.duelMoves.hands ?? 0, 10),
    benefit: "+1 Handjob level",
    effect: () => undefined,
    lewd: 2,
    thought: "(My hands know exactly what to do now.)",
  },
  {
    id: "sweetTooth",
    name: "Sweet Tooth",
    group: "afterHours",
    need: "Use your mouth 10 times in after-hours games",
    progress: (f) => count(f.records.duelMoves.mouth ?? 0, 10),
    benefit: "+1 Blowjob level",
    effect: () => undefined,
    lewd: 3,
    thought: "(I've got a taste for winning.)",
  },
  {
    id: "bornRider",
    name: "Born Rider",
    group: "afterHours",
    need: "Ride them 10 times in after-hours games",
    progress: (f) => count(f.records.duelMoves.ride ?? 0, 10),
    benefit: "+1 Sex level",
    effect: () => undefined,
    lewd: 4,
    thought: "(I set the pace now.)",
  },

  // ---- Her two sides: Karryn's Softcore and Hardcore Masochist and Sadist, one side running ahead of the other ----
  {
    id: "softTouch",
    name: "Soft Touch",
    group: "masochism",
    need: "Get rough or give in 10 more times than you slap or face them down",
    progress: (f) => count(subLead(f), 10),
    benefit: "Pleasure builds 10% faster; every rough touch you allow adds +3 to every desire",
    cost: "Your hold is 1 weaker on every touch (Consent off)",
    effect: (e) => {
      e.pleasure += 0.1;
      e.roughMeters += 3;
      e.hold -= 1;
    },
    lewd: 4,
    thought: "(I don't fight it the way I used to. I don't want to.)",
  },
  {
    id: "easyPrey",
    name: "Easy Prey",
    group: "masochism",
    need: "Get rough or give in 25 more times than you slap or face them down, with lewdness 20 or more",
    progress: (f) => count(subLead(f), 25),
    also: (f) => f.lewdness >= 20,
    benefit: "Every touch you allow pays +1 gold; pleasure builds 15% faster",
    cost: "Your hold is 2 weaker on every touch; guests are bolder (+1 nerve)",
    effect: (e) => {
      goldFor(e, 1, ...EVERY_TOUCH);
      e.pleasure += 0.15;
      e.hold -= 2;
      e.nerve += 1;
    },
    lewd: 8,
    thought: "(They all know I'll give in. So do I.)",
  },
  {
    id: "sternKeeper",
    name: "Stern Keeper",
    group: "sadism",
    need: "Slap or face them down 10 more times than you get rough or give in",
    progress: (f) => count(domLead(f), 10),
    benefit: "Your hold is 1 stronger on every touch; +1 respect for each pull away",
    cost: "Guests reach for you 10% less often (fewer touch tips)",
    effect: (e) => {
      e.hold += 1;
      e.pullRespect += 1;
      e.reach -= 0.1;
    },
    thought: "(One look, and they think twice. Good.)",
  },
  {
    id: "rulesTheRoom",
    name: "Rules the Room",
    group: "sadism",
    need: "Slap or face them down 25 more times than you get rough or give in",
    progress: (f) => count(domLead(f), 25),
    benefit: "Your hold is 2 stronger on every touch; guests are meeker (-1 nerve); +2 fame a slap",
    cost: "Every desire fills 10% slower",
    effect: (e) => {
      e.hold += 2;
      e.nerve -= 1;
      e.slapFame += 2;
      for (const m of METERS) e.sens[m] -= 0.1;
    },
    lewd: 2,
    thought: "(This is my house. They touch when I say so.)",
  },

  // ---- Her hold, part by part: Karryn's resistances. Let a part be touched enough, and it gives way easier ----
  {
    id: "openPalms",
    name: "Open Palms",
    group: "hands",
    need: "Let guests hold your hand 50 times",
    progress: (f) => count(lets(f, "hand"), 50),
    benefit: "Hand touches pay +1 gold",
    cost: "Your hold on hand touches is 1 weaker (Consent off)",
    effect: (e) => {
      goldFor(e, 1, "hand");
      holdFor(e, -1, "hand");
    },
    lewd: 2,
    thought: "(I hold my hand out before they even ask now.)",
  },
  {
    id: "softMouth",
    name: "Soft Mouth",
    group: "mouth",
    need: "Let guests touch your face or kiss you 50 times",
    progress: (f) => count(lets(f, "face", "lips"), 50),
    benefit: "Mouth desire starts each night at +5",
    cost: "Your hold on face and lip touches is 1 weaker (Consent off)",
    effect: (e) => {
      e.start.mouth += 5;
      holdFor(e, -1, "face", "lips");
    },
    lewd: 3,
    thought: "(My lips part on their own when someone leans in.)",
  },
  {
    id: "bareThroat",
    name: "Bare Throat",
    group: "neck",
    need: "Let guests touch your neck, hair or shoulders 50 times",
    progress: (f) => count(lets(f, "neck", "hair", "shoulder"), 50),
    benefit: "Body desire fills 10% faster",
    cost: "Your hold on neck, hair and shoulder touches is 1 weaker (Consent off)",
    effect: (e) => {
      e.sens.body += 0.1;
      holdFor(e, -1, "neck", "hair", "shoulder");
    },
    lewd: 2,
    thought: "(I tip my head aside without thinking. It's an invitation, and they know it.)",
  },
  {
    id: "needyChest",
    name: "Needy Chest",
    group: "breasts",
    need: "Let guests touch your chest 40 times",
    progress: (f) => count(lets(f, "chest"), 40),
    benefit: "Breasts desire starts each night at +5",
    cost: "Your hold on chest touches is 1 weaker (Consent off)",
    effect: (e) => {
      e.start.breasts += 5;
      holdFor(e, -1, "chest");
    },
    lewd: 4,
    thought: "(They ache by the end of the night if nobody's touched them.)",
  },
  {
    id: "looseHips",
    name: "Loose Hips",
    group: "hips",
    need: "Let guests hold your waist 60 times",
    progress: (f) => count(lets(f, "waist"), 60),
    benefit: "Waist touches pay +1 gold",
    cost: "Your hold on waist touches is 1 weaker (Consent off)",
    effect: (e) => {
      goldFor(e, 1, "waist");
      holdFor(e, -1, "waist");
    },
    lewd: 2,
    thought: "(I sway past the tables slow, so the hands can find me.)",
  },
  {
    id: "boldBehind",
    name: "Bold Behind",
    group: "butt",
    need: "Let guests touch your rear 40 times",
    progress: (f) => count(lets(f, "rear"), 40),
    benefit: "Butt desire starts each night at +5",
    cost: "Your hold on rear touches is 1 weaker (Consent off)",
    effect: (e) => {
      e.start.butt += 5;
      holdFor(e, -1, "rear");
    },
    lewd: 4,
    thought: "(I bend over the far tables on purpose now.)",
  },
  {
    id: "openKnees",
    name: "Open Knees",
    group: "thighs",
    need: "Let guests have your lap or thighs 40 times",
    progress: (f) => count(lets(f, "thigh", "lap"), 40),
    benefit: "Pussy desire starts each night at +5",
    cost: "Your hold on lap and thigh touches is 1 weaker (Consent off)",
    effect: (e) => {
      e.start.pussy += 5;
      holdFor(e, -1, "thigh", "lap");
    },
    lewd: 4,
    thought: "(My knees part the moment a hand lands on them.)",
  },
  {
    id: "meltingPoint",
    name: "Melting Point",
    group: "pussy",
    need: "Let guests touch you there 40 times",
    progress: (f) => count(lets(f, "intimate"), 40),
    benefit: "Pussy desire fills 15% faster",
    cost: "Your hold on touches there is 1 weaker (Consent off)",
    effect: (e) => {
      e.sens.pussy += 0.15;
      holdFor(e, -1, "intimate");
    },
    lewd: 6,
    thought: "(One touch there and I'm gone. Everyone can tell.)",
  },
  {
    id: "looseLaces",
    name: "Loose Laces",
    group: "exhibition",
    need: "Lose 20 pieces of clothing to guests",
    progress: (f) => count(f.records.clothesLost, 20),
    benefit: "+1 gold on each serve while you've lost a piece",
    cost: "Your hold on your clothes is 1 weaker (Consent off)",
    effect: (e) => {
      e.strippedGold += 1;
      holdFor(e, -1, "clothes");
    },
    lewd: 4,
    thought: "(I tie everything loose now. Easier for them. Easier for me.)",
  },
  {
    id: "buttonedUp",
    name: "Buttoned Up",
    group: "composure",
    need: "Turn away 15 guests going for your clothes",
    progress: (f) => count(f.records.clothesKept, 15),
    benefit: "Your hold on your clothes is 2 stronger (Consent off); +1 respect for each pull away",
    effect: (e) => {
      holdFor(e, 2, "clothes");
      e.pullRespect += 1;
    },
    thought: "(Every lace double-knotted. Let them try.)",
  },
  {
    id: "guarded",
    name: "Guarded",
    group: "composure",
    need: "Pull away from or slap 60 guests",
    progress: (f) => count(f.records.pulled + f.records.slapped, 60),
    benefit: "Your hold is 1 stronger on every touch (Consent off); +5 willpower",
    effect: (e) => {
      e.hold += 1;
      e.willMax += 5;
    },
    thought: "(I've said no so often it doesn't cost me anything any more.)",
  },

  // ---- Brawls: the grapples, theirs and hers, and a foe's reach mid-fight ----
  {
    id: "wrestler",
    name: "Wrestler",
    group: "brawler",
    need: "Land 15 grapples in brawls (grab, headlock, hair-pull, tackle)",
    progress: (f) => count(f.records.grapplesLanded, 15),
    benefit: "Your grapples are 10% likelier to land",
    effect: (e) => (e.grappleHit += 0.1),
    thought: "(Get hold of them first, and the fight's half won.)",
  },
  {
    id: "holdBreaker",
    name: "Hold Breaker",
    group: "brawler",
    need: "Get caught in a brawler's hold 15 times",
    progress: (f) => count(f.records.timesHeld, 15),
    benefit: "Being held throws you off half as much",
    effect: (e) => (e.heldEase += 0.5),
    thought: "(I know every way out of a grip now.)",
  },
  {
    id: "thickSkin",
    name: "Thick Skin",
    group: "brawler",
    need: "Take 20 grapples in brawls",
    progress: (f) => count(f.records.grapplesTaken, 20),
    benefit: "Their grapples do 1 less damage",
    effect: (e) => (e.grappleGuard += 1),
    thought: "(Squeeze all you like. I've had worse.)",
  },
  {
    id: "stingingReply",
    name: "Stinging Reply",
    group: "brawler",
    need: "Slap away 5 reaches in the middle of a brawl",
    progress: (f) => count(f.records.brawlSlaps, 5),
    benefit: "A slap mid-brawl hits for 2 more",
    effect: (e) => (e.brawlSlap += 2),
    thought: "(Reach for me in a fight, and you'll get the back of my hand.)",
  },
  {
    id: "scrappersBlush",
    name: "Scrapper's Blush",
    group: "brawler",
    need: "Let 5 reaches happen in the middle of a brawl",
    progress: (f) => count(f.records.brawlLets, 5),
    benefit: "Your desire gets in your way 25% less in a fight",
    cost: "Brawlers reach for you more often (+10%)",
    effect: (e) => {
      e.fightDesire += 0.25;
      e.brawlReach += 0.1;
    },
    lewd: 3,
    thought: "(A fight gets my blood up. All of it.)",
  },

  // ---- Bar work: the stew, the mop, and nights that run smooth ----
  {
    id: "stewKeeper",
    name: "Stew Keeper",
    group: "bar",
    need: "Cook 10 pots of stew",
    progress: (f) => count(f.records.stewsCooked, 10),
    benefit: "The stew cooks 25% faster",
    effect: (e) => (e.cookSpeed += 0.25),
    thought: "(Grandma's recipe. I don't even measure any more.)",
  },
  {
    id: "neverBurns",
    name: "Never Burns",
    group: "bar",
    need: "Cook 30 pots of stew",
    progress: (f) => count(f.records.stewsCooked, 30),
    benefit: "A ready stew keeps 50% longer before it burns",
    effect: (e) => (e.burnGrace += 0.5),
    thought: "(I can smell when it's ready from across the room.)",
  },
  {
    id: "broomInHand",
    name: "Broom in Hand",
    group: "bar",
    need: "Clean up 30 messes",
    progress: (f) => count(f.records.messesCleaned, 30),
    benefit: "A messy room wears on guests' patience 25% less",
    effect: (e) => (e.tidy += 0.25),
    thought: "(A spill's gone before anyone's noticed it.)",
  },
  {
    id: "spotlessHouse",
    name: "Spotless House",
    group: "bar",
    need: "Clean up 100 messes",
    progress: (f) => count(f.records.messesCleaned, 100),
    benefit: "A messy room wears on guests 25% less again; +1 respect every night",
    effect: (e) => {
      e.tidy += 0.25;
      e.perNight.respect += 1;
    },
    thought: "(Grandma would be proud of these floors.)",
  },
  {
    id: "nobodyWaits",
    name: "Nobody Waits",
    group: "bar",
    need: "Get through 3 nights with nobody walking out (serving 8 or more)",
    progress: (f) => count(f.records.smoothNights, 3),
    benefit: "Guests wait 10% longer",
    effect: (e) => (e.patience += 0.1),
    thought: "(Every table looked after. Every one.)",
  },
  {
    id: "rushHour",
    name: "Rush Hour",
    group: "bar",
    need: "Serve 15 or more orders on 3 nights",
    progress: (f) => count(f.records.busyNights, 3),
    benefit: "+1 gold on every tipped serve",
    effect: (e) => (e.serveTip += 1),
    thought: "(The busier it gets, the better I am.)",
  },

  // ---- Composure: saying no, and making it stick ----
  {
    id: "firmNo",
    name: "Firm No",
    group: "composure",
    need: "Pull away from 15 guests",
    progress: (f) => count(f.records.pulled, 15),
    benefit: "Saying no costs 25% less willpower",
    effect: (e) => (e.refuseEase += 0.25),
    thought: "(No. Just no. It's getting easier to say.)",
  },
  {
    id: "slippery",
    name: "Slippery",
    group: "composure",
    need: "Break the hold of 8 guests who grab you at the table",
    progress: (f) => count(f.records.grabsBroken, 8),
    benefit: "Guests grab you 30% less often",
    effect: (e) => (e.grab -= 0.3),
    thought: "(A twist of the wrist and I'm gone. They never learn.)",
  },
  {
    id: "iceQueen",
    name: "Ice Queen",
    group: "composure",
    need: "Pull away from or slap 100 guests",
    progress: (f) => count(f.records.pulled + f.records.slapped, 100),
    benefit: "Saying no costs 25% less willpower again; guests reach for you 15% less",
    cost: "Fewer touch tips",
    effect: (e) => {
      e.refuseEase += 0.25;
      e.reach -= 0.15;
    },
    thought: "(They've stopped trying. Mostly.)",
  },
  {
    id: "spotlessName",
    name: "Spotless Name",
    group: "composure",
    need: "Get through 8 nights without letting anyone touch you",
    progress: (f) => count(f.records.chasteNights, 8),
    benefit: "+1 respect and +1 trust every night",
    effect: (e) => {
      e.perNight.respect += 1;
      e.perNight.trust += 1;
    },
    thought: "(Folk say my name like it means something decent.)",
  },
];

/**
 * Passives that also give a skill a level outright, the way Karryn's raise "Kiss level" and the like. Kept apart
 * from the list so each passive above stays about its own benefit.
 */
export const LEVEL_UPS: Partial<Record<string, SkillId>> = {
  handInHand: "hands",
  sweetLips: "mouth",
  weakAtTheNeck: "neck",
  proudChest: "breasts",
  swayingHips: "hips",
  pinchable: "butt",
  lapWarmer: "thighs",
  aching: "pussy",
  showOff: "exhibition",
  practisedMouth: "upMouth",
  skilledHands: "upHands",
  backStairs: "upBed",
  fromBehind: "upBehind",
  upstairsCurious: "upKiss",
  bareAndBold: "exhibition",
  cleverFingers: "upHands",
  sweetTooth: "upMouth",
  bornRider: "upBed",
};

export const PASSIVE_BY_ID: ReadonlyMap<string, PassiveDef> = new Map(PASSIVES.map((p) => [p.id, p]));

/** Whether she's earned a passive. */
export function earned(def: PassiveDef, f: PassiveFacts): boolean {
  const [have, need] = def.progress(f);
  return have >= need && (def.also?.(f) ?? true);
}

/** The passives she's earned by now and doesn't have yet, in list order. */
export function newlyEarned(owned: ReadonlySet<string>, f: PassiveFacts): PassiveDef[] {
  return PASSIVES.filter((def) => !owned.has(def.id) && earned(def, f));
}

/** What all the passives she holds add up to. */
export function effectsOf(owned: ReadonlySet<string>): Effects {
  const e = noEffects();
  for (const id of owned) {
    PASSIVE_BY_ID.get(id)?.effect(e);
    const skill = LEVEL_UPS[id];
    if (skill) e.skill[skill] = (e.skill[skill] ?? 0) + 1;
  }
  return e;
}

/**
 * Her lewdness: lewd points from her passives, and a point for every five touches she's allowed, two for every
 * guest she's taken upstairs or played after hours, and two for every time she's been overwhelmed.
 */
export function lewdnessOf(owned: ReadonlySet<string>, letsTotal: number, records: Records): number {
  let points = 0;
  for (const id of owned) points += PASSIVE_BY_ID.get(id)?.lewd ?? 0;
  return points + Math.floor(letsTotal / 5) + (records.invitations + records.duelsWon + records.duelsLost) * 2 + records.overwhelmed * 2 + records.climaxes;
}

/** A word for how far she's come, by lewdness, after Karryn's slut levels. */
export function lewdWord(lewdness: number): string {
  if (lewdness < 10) return "Innocent";
  if (lewdness < 25) return "Curious";
  if (lewdness < 45) return "Awakened";
  if (lewdness < 70) return "Wanton";
  if (lewdness < 100) return "Shameless";
  return "Unashamed";
}

export function corruptWord(corruption: number): string {
  if (corruption < 10) return "Honest";
  if (corruption < 30) return "Pragmatic";
  if (corruption < 55) return "Crooked";
  if (corruption < 80) return "Corrupt";
  return "Rotten";
}

// ---------- Saving ----------

/** What a save keeps of all this. */
export interface ProgressSave {
  corruption: number;
  records: Records;
  passives: string[];
  /** Whether she eased the ache last night, for passives that pay off the next night. */
  eased?: boolean;
  /** Experience in every stat and skill. */
  xp?: Record<string, number>;
  /** Titles earned, and the ones worn (titles.ts). */
  titles?: string[];
  worn?: string[];
}

const DUEL_MOVES: readonly DuelMove[] = ["kiss", "caress", "tease", "undress", "hands", "mouth", "tits", "ride", "anal", "hold", "stop"];
const num = (raw: unknown, max = 1e6) => (typeof raw === "number" && Number.isFinite(raw) ? Math.min(max, Math.max(0, raw)) : 0);
const KINDS: readonly GuestKind[] = GUEST_KIND_LIST;
const kindList = (raw: unknown): GuestKind[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((k): k is GuestKind => KINDS.includes(k as GuestKind)))] : [];

/** Progress from a save, with anything broken put back to its start. Older saves have none. */
export function readProgress(raw: unknown): ProgressSave {
  const out: ProgressSave = { corruption: 0, records: newRecords(), passives: [] };
  if (!raw || typeof raw !== "object") return out;
  const fields = raw as Partial<Record<keyof ProgressSave, unknown>>;
  out.corruption = num(fields.corruption, 1000);
  out.eased = fields.eased === true;
  if (fields.xp && typeof fields.xp === "object") out.xp = fields.xp as Record<string, number>;
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : undefined);
  out.titles = ids(fields.titles);
  out.worn = ids(fields.worn);
  if (Array.isArray(fields.passives)) out.passives = [...new Set(fields.passives.filter((id): id is string => typeof id === "string" && PASSIVE_BY_ID.has(id)))];
  const r = fields.records;
  if (r && typeof r === "object") {
    const src = r as Record<string, unknown>;
    const rec = out.records;
    for (const key of [
      "leans",
      "pulled",
      "slapped",
      "rough",
      "subWins",
      "domWins",
      "clothesKept",
      "grapplesLanded",
      "grapplesTaken",
      "timesHeld",
      "brawlSlaps",
      "brawlLets",
      "grabbed",
      "grabsBroken",
      "grabsAllowed",
      "peeks",
      "flashes",
      "showsRefused",
      "raids",
      "stewsCooked",
      "messesCleaned",
      "smoothNights",
      "busyNights",
      "allHigh",
      "clothesLost",
      "bareNights",
      "invitations",
      "taproomScenes",
      "taproomPartners",
      "taproomMost",
      "overwhelmed",
      "climaxes",
      "alone",
      "served",
      "poured",
      "washed",
      "chasteNights",
      "respectNights",
      "fightsWon",
      "fightsLost",
      "talkedDown",
      "dodges",
      "rumors",
      "duelsWon",
      "duelsLost",
      "duelsStopped",
      "edgeWins",
      "boldWins",
      "heldBack",
      "undressed",
      "loads",
    ] as const) {
      rec[key] = Math.floor(num(src[key]));
    }
    rec.upstairsKinds = kindList(src.upstairsKinds);
    if (src.kinds && typeof src.kinds === "object") {
      for (const [region, list] of Object.entries(src.kinds as Record<string, unknown>)) {
        if (region in METER_OF) rec.kinds[region as TouchRegion] = kindList(list);
      }
    }
    if (src.maxed && typeof src.maxed === "object") {
      for (const meter of METERS) {
        const n = Math.floor(num((src.maxed as Record<string, unknown>)[meter]));
        if (n > 0) rec.maxed[meter] = n;
      }
    }
    if (src.duelMoves && typeof src.duelMoves === "object") {
      for (const move of DUEL_MOVES) {
        const n = Math.floor(num((src.duelMoves as Record<string, unknown>)[move]));
        if (n > 0) rec.duelMoves[move] = n;
      }
    }
    if (src.cum && typeof src.cum === "object") {
      for (const spot of CUM_SPOTS) {
        const n = Math.floor(num((src.cum as Record<string, unknown>)[spot]));
        if (n > 0) rec.cum[spot] = n;
      }
    }
    if (src.acts && typeof src.acts === "object") {
      for (const act of UPSTAIRS_ACTS) {
        const n = Math.floor(num((src.acts as Record<string, unknown>)[act]));
        if (n > 0) rec.acts[act] = n;
      }
    }
  }
  return out;
}
