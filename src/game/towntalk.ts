/**
 * Town talk: what the people of Tarven say to her (or him) out on the high street by day, what she answers or thinks
 * back, the short exchanges when she stops to talk, and what two townsfolk standing together say about her.
 *
 * Most of it reads her state (TOWN_DAY.md section 4, "Being seen"): her arc stage, Respect, Fame, Lust, how drunk she
 * is, whether she's still messy from last night, what she's wearing or not wearing, the public titles she wears, the
 * passives a stranger could notice, her debuffs, the Lantern, and what she did at Act 1's last calls. Lines keyed to
 * her state win over the town's own chatter whenever they apply (KEYED_SHARE), and the louder a state is (bare in the
 * square beats a public title), the more of the talk it takes (`salience`).
 *
 * Pure data and picking: no three.js, no page. The game fills a `TownFacts` from the Tavern and calls the pickers.
 *
 * Writing rules (GAME_CONCEPT.md section 3, STORY.md 4b, WORLD.md 7d): an adult comedy, crude and absurd, explicit at
 * the lewd stages, warm at high Respect. Every line fits a speech bubble (BUBBLE_MAX letters, after the tokens are
 * filled). Two siblings play: lines either fit both (tokens below, or "you" and "keeper") or are gated with `b`.
 * Nothing here says anything happened to her while passed out (GAME_PATH.MD), and nobody is ever childlike. A bigot
 * is always the butt of his own line.
 *
 * Tokens filled for her body: {lass} lass/lad, {Lass}, {she} she/he, {She}, {her} her/him (object), {hers} her/his,
 * {grandchild} granddaughter/grandson, {woman} woman/man.
 *
 * Ids are the group's prefix and the line's place in it: they only stop repeats, nothing saves them.
 */
import type { DebuffId } from "./debuffs";
import type { ArcStage } from "./lewd";
import type { Mood } from "./mood";
import type { PlotFlag } from "./plot";
import type { GuestKind } from "./tavern";

/** The longest a line may be, filled in, to sit in one speech bubble (chatter.ts `lineDuration` tops out near it). */
export const BUBBLE_MAX = 90;
/** How often a line keyed to her state is picked over the town's own chatter, when one fits. */
export const KEYED_SHARE = 0.82;
/** The same for two townsfolk talking: how often it's about her. */
export const CHAT_ABOUT_HER_SHARE = 0.7;
/** A state this loud (salience) takes nearly all the talk: LOUD_KEYED_SHARE instead of KEYED_SHARE. */
const LOUD_STATE = 10;
const LOUD_KEYED_SHARE = 0.92;
/** How much more often a line written for the speaker's kind or people is picked over an open line. */
const VOICED_WEIGHT = 3;

export type HeroBody = "Female" | "Male";
export type Race = "human" | "elf" | "dwarf" | "orc" | "beastfolk" | "goblin";
export const RACES: readonly Race[] = ["human", "elf", "dwarf", "orc", "beastfolk", "goblin"];

/** What shows of her: all there, a piece gone, her underthings showing, bare on top, bare below, or nothing on. */
export type Dress = "dressed" | "missingPiece" | "underwear" | "topless" | "bareBottom" | "naked";
/** What kind of clothes she's out in: the tavern dress, old-fashioned, modern, Lantern wear, lingerie, the priestess's. */
export type OutfitStyle = "work" | "medieval" | "modern" | "revealing" | "lingerie" | "church";

/** Everything about her that the town's talk keys on, as plain numbers and sets the game fills from its state. */
export interface TownFacts {
  /** Which sibling is out: the lines fit, or are gated, by body. */
  body: HeroBody;
  /** Her arc (lewd.ts `arcStage`, Tavern.arcStage). */
  arc: ArcStage;
  lewdness: number;
  corruption: number;
  /** Persona respect, -10 to 10. */
  respect: number;
  /** Persona fame, 0 to 100. */
  fame: number;
  /** Persona flirt, 0 to 10. */
  flirt: number;
  /** Persona lust, 0 to 10. */
  lust: number;
  /** Her strongest desire meter right now, 0 to 100. */
  desire: number;
  /** How drunk she is, 0 to 1. */
  drunk: number;
  /** Willpower left, as a share of her most: 0 to 1. */
  willpower: number;
  /** The passives she holds, by id. */
  passives: ReadonlySet<string>;
  /** The titles she's wearing, by id. Only the public ones (PUBLIC_TITLES) are known in the street. */
  titles: readonly string[];
  debuffs: readonly DebuffId[];
  /** Something men left is still on her. */
  messy: boolean;
  /** Her clothes show stains. */
  stained: boolean;
  /** She smells of last night. */
  smellsOfSex: boolean;
  dress: Dress;
  outfit: OutfitStyle;
  /** The world clock's hour, 8 to 17 by day. */
  hour: number;
  /** The day, 0 for the first. */
  day: number;
  fans: number;
  /** The village's trust, 0 to TRUST_MAX (15). */
  trust: number;
  /** The garrison's heat, 0 to HEAT_MAX (8). */
  heat: number;
  /** The Lantern: never hung, hung and dark, or lit. */
  lantern: "none" | "dark" | "lit";
  /** Act 1's story flags. */
  plot: ReadonlySet<PlotFlag>;
  /**
   * Her standing in town: what people call her and how formally (TOWN_DAY.md 6). "keeper" when unset. Any id is
   * accepted; unknown ones read as the keeper until lines are written for them (`roleGroup`).
   */
  role?: RoleId;
  /** The Consent switch (GAME_PATH.MD): off, hands may land without asking. Unset reads as On. */
  consentOff?: boolean;
  /** Passed out: nothing is said to her or done to her, whatever the switch. */
  passedOut?: boolean;
}

/** Who's talking: their kind, man or woman, and their people when the game knows it. */
export interface Townsperson {
  kind: GuestKind;
  female: boolean;
  race?: Race;
}

/** A neutral heroine on an ordinary morning, to build facts on. */
export function blankTownFacts(body: HeroBody = "Female"): TownFacts {
  return {
    body,
    arc: "sheltered",
    lewdness: 0,
    corruption: 0,
    respect: 0,
    fame: 0,
    flirt: 0,
    lust: 0,
    desire: 0,
    drunk: 0,
    willpower: 1,
    passives: new Set(),
    titles: [],
    debuffs: [],
    messy: false,
    stained: false,
    smellsOfSex: false,
    dress: "dressed",
    outfit: "work",
    hour: 10,
    day: 3,
    fans: 40,
    trust: 5,
    heat: 0,
    lantern: "none",
    plot: new Set(),
  };
}

// ---------- Filling the facts ----------

/** A garment as wardrobe.ts describes it: enough to tell what's showing. */
export interface WornPiece {
  id: string;
  layer: "accessory" | "outer" | "legwear" | "under" | "smallclothes";
  region: "waist" | "top" | "bottom" | "legs" | "feet";
  keep?: string;
}

/**
 * What shows of her, from her outfit's strip ladder (wardrobe.ts `stripLadder`) and the pieces that are off her
 * (Tavern.shownPieces). Bare on top or below once every piece covering it is off.
 */
export function dressOf(ladder: readonly WornPiece[], off: readonly string[]): Dress {
  const gone = new Set(off);
  const pieces = ladder.filter((g) => !g.keep);
  const covers = (region: WornPiece["region"]) => pieces.filter((g) => g.region === region && g.layer !== "accessory" && g.layer !== "legwear");
  const bare = (region: WornPiece["region"]) => {
    const cover = covers(region);
    return cover.length > 0 && cover.every((g) => gone.has(g.id));
  };
  const top = bare("top");
  const bottom = bare("bottom");
  if (top && bottom) return "naked";
  if (top) return "topless";
  if (bottom) return "bareBottom";
  if (pieces.some((g) => g.layer === "outer" && g.region !== "feet" && gone.has(g.id))) return "underwear";
  if (pieces.some((g) => gone.has(g.id))) return "missingPiece";
  return "dressed";
}

/** What kind of clothes an outfit id (appearance.ts) is. Unknown ids are her work clothes. */
export function outfitStyleOf(outfit: string | undefined): OutfitStyle {
  if (!outfit || outfit === "tavern") return "work";
  if (/tee|jeans|hoodie|crop|legging|modern/i.test(outfit)) return "modern";
  if (outfit === "dirndl") return "medieval";
  if (outfit === "priestess") return "church";
  if (outfit === "babydoll" || outfit === "frills") return "lingerie";
  if (outfit === "bunny" || outfit === "gown" || outfit === "plunge") return "revealing";
  return "work";
}

/**
 * The titles that have gone public (WORLD.md section 9): the town calls her by them. Which ones is still the user's
 * call; take ids out to keep a title private.
 */
export const PUBLIC_TITLES: ReadonlySet<string> = new Set([
  "barmaid",
  "hearthKeeper",
  "untouchable",
  "ironHand",
  "everyonesDarling",
  "unashamed",
  "baronsCreature",
  "prideOfTarven",
  "drinksThemUnder",
  "brawlQueen",
  "nightChampion",
  "lifeOfTheParty",
  "tableFavourite",
  "seasoned",
]);

// ---------- Tokens ----------

const TOKENS: Record<string, readonly [string, string]> = {
  lass: ["lass", "lad"],
  Lass: ["Lass", "Lad"],
  she: ["she", "he"],
  She: ["She", "He"],
  her: ["her", "him"],
  hers: ["her", "his"],
  Hers: ["Her", "His"],
  herself: ["herself", "himself"],
  grandchild: ["granddaughter", "grandson"],
  woman: ["woman", "man"],
};

/**
 * A line with its tokens filled for her body, and for her standing: {role} is how she's addressed ("Reeve",
 * "Dame", "keeper"), {rep} the public name she's best known by.
 */
export function fillTown(text: string, body: HeroBody, role: RoleId = "keeper", rep = "keeper"): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (key === "role") return roleAddress(role, body);
    if (key === "Role") return capital(roleAddress(role, body));
    if (key === "rep") return rep;
    return TOKENS[key]?.[body === "Female" ? 0 : 1] ?? whole;
  });
}

const capital = (text: string) => text[0].toUpperCase() + text.slice(1);

/** A line filled for this heroine: her body, how she's addressed, and the name she's known by. */
export function fillFor(text: string, f: TownFacts): string {
  return fillTown(text, f.body, f.role, topName(f));
}

// ---------- The lines ----------

export type TownCategory =
  | "arc"
  | "respect"
  | "fame"
  | "lust"
  | "drunk"
  | "mess"
  | "dress"
  | "outfit"
  | "title"
  | "passive"
  | "debuff"
  | "lantern"
  | "plot"
  | "corruption"
  | "trust"
  | "will"
  | "fans"
  | "time"
  | "kind"
  | "race"
  | "street"
  | "role"
  | "rep"
  | "treat";

/** The categories that read her state. The rest (the hour, who's talking, the town) are flavour. */
export const STATE_CATEGORIES: readonly TownCategory[] = [
  "arc",
  "respect",
  "fame",
  "lust",
  "drunk",
  "mess",
  "dress",
  "outfit",
  "title",
  "passive",
  "debuff",
  "lantern",
  "plot",
  "corruption",
  "trust",
  "will",
  "fans",
  "role",
  "rep",
  "treat",
];
const STATE = new Set<TownCategory>(STATE_CATEGORIES);

type When = (f: TownFacts) => boolean;
/** Her four stages, in order: Sheltered, Curious, Willing, Known. */
export type Stage4 = readonly [string, string, string, string];

interface Gate {
  /** Who can say it: their kind, their people, man ("m") or woman ("f"). */
  k?: readonly GuestKind[];
  r?: readonly Race[];
  sex?: "f" | "m";
  /** Which of the siblings it fits, when not both. */
  b?: HeroBody;
  /** More of her state it needs, on top of its group's. */
  w?: When;
  /** A hand that lands without asking: only with the Consent switch off. */
  lands?: boolean;
}

/** Something the speaker does as they say it, for the game to play on them later. */
export type TownAct = "nod" | "whistle" | "proposition" | "grope" | "photo" | "bow" | "spit" | "offer-coin";

interface Extra extends Gate {
  m?: Mood;
  /** Her answer to this line in particular, by stage. */
  reply?: Stage4;
  act?: TownAct;
  /** A question she answers yes or no (a touch asked for): her answer is `HerReply.answer`. */
  ask?: boolean;
}

type Entry = string | readonly [string, Extra];

/** A line a townsperson says to her as she passes. */
export interface TownLine extends Gate {
  id: string;
  text: string;
  category: TownCategory;
  when?: When;
  mood: Mood;
  /** The reply pool her answer comes from (REPLIES), most specific first. */
  replyKey: string;
  reply?: Stage4;
  act?: TownAct;
  ask?: boolean;
}

const ARC_ORDER: readonly ArcStage[] = ["sheltered", "curious", "willing", "known"];
/** Her stage as the four-stage pools read it: a Legend is Known underneath, with her own lines on top where written. */
const talkStage = (stage: ArcStage): ArcStage => (stage === "legend" ? "known" : stage);
const stageIndex = (stage: ArcStage) => ARC_ORDER.indexOf(talkStage(stage));
/** Whether she's at one of these stages; Known takes in Legend too. */
const atStage = (stages: readonly ArcStage[], arc: ArcStage) => stages.includes(arc) || stages.includes(talkStage(arc));
const and = (a?: When, b?: When): When | undefined => (a && b ? (f) => a(f) && b(f) : (a ?? b));

function group(prefix: string, category: TownCategory, when: When | undefined, mood: Mood, entries: readonly Entry[], replyKey = prefix): TownLine[] {
  return entries.map((entry, i) => {
    const [text, extra] = typeof entry === "string" ? [entry, {} as Extra] : entry;
    const { m, w, reply, ...gate } = extra;
    return { id: `${prefix}.${i}`, text, category, when: and(when, w), mood: m ?? mood, replyKey, reply, ...gate };
  });
}

// Conditions on her.
const stage = (...stages: ArcStage[]): When => (f) => atStage(stages, f.arc);
/** Exactly this stage, for the stage's own line group (Legend has its own). */
const only = (s: ArcStage): When => (f) => f.arc === s;
const late: When = (f) => stageIndex(f.arc) >= 2;
const has = (...ids: string[]): When => (f) => ids.some((id) => f.passives.has(id));
const wearing = (id: string): When => (f) => PUBLIC_TITLES.has(id) && f.titles.includes(id);
const flag = (p: PlotFlag): When => (f) => f.plot.has(p);
const debuffed = (d: DebuffId): When => (f) => f.debuffs.includes(d);
const shady: When = (f) => f.corruption >= 40;
const topBare: When = (f) => f.dress === "topless" || f.dress === "naked";
const bottomBare: When = (f) => f.dress === "bareBottom" || f.dress === "naked";

const F = "Female" as const;
const M = "Male" as const;

/** What townsfolk call out to her as she walks by. */
const BASE_PASSING: readonly TownLine[] = [
  // ---- Her arc (STORY.md 4b) ----
  ...group("arc.sheltered", "arc", stage("sheltered"), "calm", [
    "Morning, keeper. You've Wren's chin, you know. Not her mouth, thank the gods.",
    "Mind the mud, {lass}. Valley shoes don't last a week up here.",
    "Good morning! ...Look at that, red as a radish already.",
    "Don't let the soldiers wink at you, keeper. They wink at the goats too.",
    "Wren's {grandchild}! You look like you've never been kissed. It's sweet.",
    "Chapel's up the hill, love. You look the chapel sort.",
    "Bet you a copper you go red before you reach the well.",
    "The barracks have a pool on who gets your first smile. I've got Dunn.",
    "Morning! Don't look so frightened, we only bite on market day.",
    "Wren had this street eating out of her hand. You'll get there. Maybe.",
    ["Keeper. The lads say you jump if anyone says boo. ...Boo.", { k: ["soldier"], m: "happy" }],
    ["Eat something, {lass}. You're all nerves and elbows.", { k: ["farmer"] }],
    ["Ah, the timid little innkeeper. How quaint. How very mountain.", { k: ["noble"] }],
    ["Careful who you smile at, keeper. Smiles cost extra on the quarry road.", { k: ["smuggler", "bandit"] }],
  ]),
  ...group("arc.curious", "arc", stage("curious"), "happy", [
    "Heard you let a smuggler hold your hand. Hold your hand! Scandal.",
    "Somebody's warming up, they say. Is it the weather, keeper?",
    "Saw you smile at the blacksmith. He hasn't put his hammer down since.",
    "They say the new keeper's not so shy after dark.",
    "You've stopped blushing! Nearly. ...There it is.",
    "Rumour says you might. Is the rumour right, keeper?",
    "Somebody kissed you behind the bar, they say. Name them, I'll buy them a drink.",
    "The barracks pool's paid out. Dunn lost. Somebody got a smile.",
    "Walking a bit looser these days, keeper. Good for you.",
    "The farmers' wives are watching you now. That's how you know it's working.",
    ["The lads say you didn't slap Corporal Hobb. Hobb's unbearable now.", { k: ["soldier"] }],
    ["Word is you're curious, keeper. Curiosity's my trade. Talk tonight.", { k: ["smuggler"], m: "scheming" }],
    ["Our bard's writing a verse about you. It's a short verse. So far.", { k: ["adventurer"] }],
    ["You've a little flush on you lately, keeper. Suits you. Don't tell my wife.", { sex: "m" }],
  ]),
  ...group("arc.willing", "arc", stage("willing"), "lust", [
    "Keeper! Saving me a seat tonight? Or a lap?",
    "Ask for the keeper by name, they say. So: keeper. Tonight?",
    "Heard you went upstairs with a soldier. And came down smiling.",
    "My cousin says you're worth the walk up the pass. He walked it twice.",
    "There's a queue for your tables now. I'm in it. Since Tuesday.",
    "Is it right you charge extra for the corner table? What's in the corner?",
    "Higher costs more, they tell me. What's the price of the top shelf?",
    "Morning, keeper. My wife says I'm not allowed to say good morning to you any more.",
    "You've your grandmother's walk now. The old men are weeping in the square.",
    ["The barracks drew straws for who sits by you tonight. I drew short. Twice.", { k: ["soldier"] }],
    ["Corran's lads talk about you more than the toll wagons. That's a compliment.", { k: ["bandit"] }],
    ["One hears things about your back room. One would like to hear them first-hand.", { k: ["noble"] }],
    ["Whatever you're doing, keeper, teach me. My husband's never looked at me like that.", { sex: "f", m: "happy" }],
    ["The party's back from the ruins tonight. We've coin, and we've heard things.", { k: ["adventurer"] }],
  ]),
  ...group("arc.known", "arc", only("known"), "lust", [
    "There {she} goes, the best ride on the pass!",
    "Oi, keeper! Same as last night? I've been saving up all day.",
    "Travellers ask the way to your tavern by the bed, not the beer.",
    "Is it true you took on the whole table? Even Grumbold? Grumbold's huge.",
    "Keeper! My lap's been cold since you left it.",
    "Half the pass has had you, keeper, and the other half's saving up.",
    "Don't bother cooking stew tonight, keeper. We know what we're coming for.",
    "Wives drag their husbands indoors when you pass. The husbands climb out the window.",
    "Known on the pass, you are. Known everywhere. Known biblically, mostly.",
    ["Keeper! I've a cock with your name on it. Tattooed. Lost a bet.", { sex: "m" }],
    ["Your tits were all over the feed last night, keeper. Lovely framing.", { b: F }],
    ["Your cock was all over the feed last night, keeper. Lovely framing.", { b: M }],
    ["Keeper. You. Me. Tonight. Yes or no? Orcs like a straight answer.", { r: ["orc"] }],
    ["I told the whole Deephold about you. They're coming up in shifts.", { r: ["dwarf"] }],
    ["Darling, the whole court whispers your name. Usually mid-swoon.", { k: ["noble"], sex: "f" }],
    ["My husband says your name in his sleep. I've started saying it too.", { sex: "f" }],
  ]),
  ...group("arc.legend", "arc", only("legend"), "idolize", [
    "Keeper! We chant your name at breakfast now. The kids started it.",
    "Keeper! Sing the second verse with us tonight? You're in it.",
    "My kids know your song. I don't know how. I'm moving.",
    "There {she} is! Somebody fetch the drum!",
    "They've named a cheese after you, keeper. It's very soft and very popular.",
    "Seen the inn sign? Somebody painted you on the back. All of you.",
    "Is it true you bowed to the Baron's tax man? Bare? He resigned.",
    "Travellers come up the pass just to shout your name at the door.",
    ["Keeper! The lads made you a banner. It's mostly tits.", { k: ["soldier"], b: F }],
    ["Keeper! The lads made you a banner. It's mostly cock.", { k: ["soldier"], b: M }],
    ["The Deephold's got your song in three keys now, keeper. All filthy.", { r: ["dwarf"] }],
    ["Darling, the court's begging for the dance. The one with the knees.", { k: ["noble"], sex: "f" }],
  ]),
  ...group("arc.rotten", "arc", and(late, shady), "scheming", [
    "That'll cost you, isn't a joke at your place any more, they tell me.",
    "The room's yours and you use it, they say. Wren would've been proud. Or scared.",
    "Keeper! What's the rate today? It went up again, didn't it.",
    ["Rotten Madam, the girls at the Velvet House call you. Jealous, I think.", { b: F }],
  ]),

  // ---- Respect ----
  ...group("respect.hi", "respect", (f) => f.respect >= 4, "happy", [
    "Good morning, keeper. An honour, truly.",
    "Thank you for last week, keeper. My son came home sober for once.",
    "Keeper! Fair prices and a clean room. Wren would be proud.",
    "There's a keeper who says no and means it. My respects.",
    "If you need anything, keeper, my door's open. Properly open. Not like that.",
    "Everyone minds their manners in your place. Even Pike. How?",
    "Hats off, lads, it's the keeper. Yes, you, Harl. Off.",
    ["Keeper. The captain says yours is the only house she trusts.", { k: ["soldier"] }],
    ["Brought you the good turnips, keeper. Not the ones I sell the Copper Bell.", { k: ["farmer"] }],
    ["Remarkable. A tavern keeper with manners. I must tell the Baroness.", { k: ["noble"] }],
    ["You kept my secret and fed me without asking. I'll not forget it.", { k: ["fugitive"] }],
  ]),
  ...group("respect.lo", "respect", (f) => f.respect <= -3, "lust", [
    "Oi, keeper! How much for the afternoon?",
    "Look who it is. The pass's favourite mattress.",
    "Don't bother saying hello, keeper. Just say a price.",
    "My mother says not to talk to you. She says it loudly. Here she comes.",
    "Bend over the well, keeper, I dropped a copper. Twice.",
    "Keeper! Is the tavern open, or just you?",
    "Oi! Turn round, keeper. I missed the back.",
    ["Keep your distance, innkeeper. These are new boots.", { k: ["noble"], m: "angry" }],
    ["The barracks have a nickname for you, keeper. It rhymes. It's filthy.", { k: ["soldier"] }],
    ["Keeper. Know a lot of folk, do you? Biblically, I mean.", { k: ["bandit", "smuggler"] }],
  ]),

  // ---- Fame (her name on the feed) ----
  ...group("fame.known", "fame", (f) => f.fame >= 20 && f.fame < 50, "idolize", [
    "You're the keeper from the feed! The one with the stew post!",
    "Oh! Can I get a photo? My sister won't believe me.",
    "Keeper! I follow your tavern. I've never been in. But I follow it.",
    "Is that... it is! The keeper! Hold still, my phone's slow.",
    ["Picture for the guild wall, keeper? Between the troll head and the map.", { k: ["adventurer"] }],
  ]),
  ...group("fame.famous", "fame", (f) => f.fame >= 50 && f.fame < 80, "idolize", [
    "Keeper! Sign my phone? With a knife, it's fine, it's a cheap one.",
    "They talk about you down in the lowlands. I've come up special.",
    "Zane posted you again. Four thousand hearts. Even my nan hearted it.",
    "Everyone's heard of your tavern. Even the goats look up when you pass.",
    ["Licensed phone charm of your face, keeper! Two silver. Unlicensed, one.", { r: ["goblin"], m: "scheming" }],
  ]),
  ...group("fame.legend", "fame", (f) => f.fame >= 80, "idolize", [
    "Gods, it's actually you. I walked from the coast. Can I touch your sleeve?",
    "The bards sing about you in Sylvaran. Elves! Singing! About a tavern!",
    "You're more famous than the Hero, keeper. Kevin's furious. Well, sleepy.",
    "Make way! It's the keeper! ...Sorry, I've always wanted to shout that.",
    ["A noble house would pay you to dine at it. Mine, for instance. Name a night.", { k: ["noble"] }],
  ]),
  ...group("fame.nobody", "fame", (f) => f.fame < 5 && f.day >= 3, "calm", [
    "Who are you, then? ...The tavern? There's a tavern?",
    "Wren's place? Is that still open? Huh. Good luck.",
  ]),

  // ---- Her own wanting, and her name as a flirt ----
  ...group("lust.want", "lust", (f) => f.desire >= 80 || f.lust >= 7, "lust", [
    "You're flushed, keeper. Fever? Or the other thing?",
    "You're looking at my sausages like they owe you money, keeper.",
    "Somebody's got that look this morning. Who's the lucky one?",
    "You're biting your lip, keeper. Bite mine instead?",
    "Steady, keeper. You looked at that cucumber like it proposed.",
    "Need a cold bath, keeper? The trough's free. The horse won't mind.",
    ["You smell like wanting, keeper. Orcs can tell. No shame in it. Ask.", { r: ["orc"] }],
    ["Your scent's loud today, keeper. Like heat season. Only saying.", { r: ["beastfolk"] }],
  ]),
  ...group("lust.flirt", "lust", (f) => f.flirt >= 5, "happy", [
    "There goes the biggest flirt on the pass! Morning, flirt!",
    "Don't wink at me in the street, keeper. My wife has eyes in her bonnet.",
    "Blow me a kiss, keeper! ...Not THAT kind, Brother Oden's watching.",
    "You winked at me last night. Was it me? Or the man behind me?",
  ]),

  // ---- Drink ----
  ...group("drunk.tipsy", "drunk", (f) => f.drunk >= 0.3 && f.drunk < 0.6, "happy", [
    "Bit early for a drink, keeper. Or is it late, for you?",
    "You're walking like the street's on a boat, keeper.",
    "Morning, keeper! Hair of the dog? Or the whole dog?",
    "Is that ale on your breath, keeper, or are you just happy to see me?",
  ]),
  ...group("drunk.drunk", "drunk", (f) => f.drunk >= 0.6, "drunk", [
    "Keeper, the well's that way. No, that way. You're hugging a post.",
    "Somebody walk the keeper home before {she} proposes to a goat.",
    "Keeper! You just bowed to a horse. It bowed back. Respect.",
    "Steady! Sit on the trough a minute. Not in it. On it.",
    "You're singing Wren's rude song in the street, keeper. All nine verses.",
    ["Ha! Drunk before noon. You'd do well in the Deephold, keeper.", { r: ["dwarf"], m: "happy" }],
    ["Drink some water, love. Or milk. Our cow's very understanding.", { k: ["farmer"], m: "calm" }],
  ]),

  // ---- Last night, still on her ----
  ...group("mess.messy", "mess", (f) => f.messy, "happy", [
    "Keeper, you've... something on your cheek. And your neck. And... never mind.",
    "Is that porridge in your hair, keeper? ...It's not porridge, is it.",
    "You missed a spot, keeper. Several spots. Long night?",
    "Morning, keeper! Glazed like a festival bun.",
    "Somebody tell the keeper where the bathhouse is. Somebody brave.",
    "Hold still, I've a hanky. ...You know what, keep the hanky.",
    "Is that... dripping, keeper? From your chin? Gods, it is.",
    ["Keeper! Soap? Good soap! Strong soap! For you, the strongest one!", { r: ["goblin"], m: "scheming" }],
  ]),
  ...group("mess.stained", "mess", (f) => f.stained, "happy", [
    "Lovely dress, keeper. Shame about the stains. Or are those the trim?",
    "Those stains on your front aren't stew, are they, keeper?",
    "Never seen a wet patch shaped like the Baron's keep before.",
    ["Spot of starch on your skirt there, keeper. A lot of starch. Fresh starch.", { b: F }],
    ["Spot of starch on your breeches, keeper. Big spot. Still wet.", { b: M }],
  ]),
  ...group("mess.smell", "mess", (f) => f.smellsOfSex, "happy", [
    "Sniff, sniff. Keeper, you smell like the back room of the Velvet House.",
    "What's that smell? Fish? ...Oh. Oh! Morning, keeper.",
    "Wind's from your tavern, keeper. I can smell last night from here.",
    ["Keeper, I'm wolf-kin. I can smell four men on you. And one I know.", { r: ["beastfolk"], m: "scheming" }],
    ["Good heavens. Stand downwind, innkeeper, there's a dear.", { k: ["noble"], m: "angry" }],
    ["You smell of rutting. A good night, then? Orcs say well done.", { r: ["orc"] }],
    ["An elf can smell a scandal a mile off. You, keeper, are a scandal.", { r: ["elf"] }],
    ["Smells like the barn at breeding time. Ah. Morning, keeper.", { k: ["farmer"] }],
  ]),

  // ---- What shows (TOWN_DAY.md 4: what she wears outside counts) ----
  ...group("dress.missing", "dress", (f) => f.dress === "missingPiece", "happy", [
    "Lose something, keeper? Your apron's halfway down the pass, I hear.",
    "Wardrobe accident, keeper? Or a wardrobe decision?",
    "Bit underdressed for the market, keeper. Bit overdressed for the Lantern.",
    "You're short a piece, keeper. Did a dare eat it?",
    ["Lost your belt in a bet? I've lost a horse that way. Same face you've got.", { k: ["adventurer", "bandit"] }],
  ]),
  ...group("dress.under", "dress", (f) => f.dress === "underwear", "lust", [
    "Keeper! Your smalls are showing. ...Not complaining. Reporting.",
    "Is that your underthings? In the street? Brave. Cold, but brave.",
    "The baker just walked into a post. Cover up, keeper, think of the posts.",
    "Nice smallclothes, keeper. Wren had the same ones. ...I heard.",
    ["Lovely band, keeper. Is it new? Is it laundry day?", { b: F }],
    ["Keeper, I'm obliged to report an exposure. ...No. Carry on. Carry on.", { k: ["soldier"], m: "happy" }],
  ]),
  ...group("dress.top", "dress", topBare, "lust", [
    "Bare up top in the high street. Wren would've charged for that.",
    ["Keeper! Your tits are out! ...Just thought you'd want to know. Lovely day for it.", { b: F }],
    ["Morning, keeper. Morning, keeper's tits.", { b: F }],
    ["The goblin's selling postcards of you already. Cover up or take a cut.", { b: F }],
    ["Nipples like that, keeper, you'll have someone's eye out.", { b: F }],
    ["Tits out at the market! The melon man's lost all his customers to you.", { b: F }],
    ["Put a shirt on, keeper! The washerwomen have stopped washing.", { b: M }],
    ["All that chest out in the market, keeper? The butcher's jealous.", { b: M }],
    ["Postcards of you shirtless, two silver! Keeper, smile for the next batch!", { b: M, r: ["goblin"] }],
  ]),
  ...group("dress.bottom", "dress", bottomBare, "lust", [
    "Bare-arsed in the square! Does the council know? Do they want to?",
    "Cover your bits, keeper. The chapel's right there. Oden's going pink.",
    ["Keeper, your arse is out. And the rest. Is that a new law?", { b: F }],
    ["Keeper, the whole street can see your pussy. ...Lovely, mind.", { b: F }],
    ["Keeper, your cock's out. Swinging in the market like a bell rope.", { b: M }],
    ["Your balls are out in the wind, keeper. They look cold. They look brave.", { b: M }],
  ]),
  ...group("dress.naked", "dress", (f) => f.dress === "naked", "lust", [
    "Naked as a peeled egg in the high street. Keeper, you're my hero.",
    "Did the dares win, keeper? All of them? Every last thread?",
    "Nobody look! ...Everybody's looking. Sorry, keeper.",
    ["Keeper! You're starkers! The guard at the gate's crying with joy.", { b: F }],
    ["Good gods, {she}'s nude! Fetch my smelling salts. And my phone.", { k: ["noble"], m: "scared" }],
    ["Naked in the street. Like a true orc on a feast day. Proud of you.", { r: ["orc"], m: "happy" }],
    ["Keeper! Clothes! Cheap! Two silver and I'll throw in a hat!", { r: ["goblin"], m: "scheming" }],
  ]),

  // ---- What she's wearing ----
  ...group("outfit.modern", "outfit", (f) => f.outfit === "modern", "happy", [
    "Nice tee, keeper. What's it say? ...Oh, it's just tight.",
    "Modern clothes on Wren's {grandchild}! The old women are scandalised. Thrilled.",
    "Proper lowland fashion, keeper. The elves would copy it if they could bear to.",
    ["Leggings! Very modern, keeper. Very... informative.", { b: F, m: "lust" }],
    ["Where'd you get those jeans? The goblins? They never have my size.", { r: ["goblin", "dwarf", "human"] }],
  ]),
  ...group("outfit.revealing", "outfit", (f) => f.outfit === "revealing", "lust", [
    "Keeper, are you wearing your Lantern dress to buy turnips?",
    "That's more slit than dress, keeper.",
    "Walking the market in your night clothes? Saves time, I suppose.",
    ["Plunging neckline, keeper. The butcher plunged a cleaver into his thumb.", { b: F }],
    ["How daring. One wouldn't wear that at court. One might, at the Queen's.", { k: ["noble"] }],
  ]),
  ...group("outfit.lingerie", "outfit", (f) => f.outfit === "lingerie", "lust", [
    "Keeper, you're in your undies. Your fancy undies. In the street.",
    "Frills in the high street! Is it a festival, or are you selling something?",
    ["That's a nightie, keeper. A very see-through nightie.", { b: F }],
  ]),
  ...group("outfit.church", "outfit", (f) => f.outfit === "church", "happy", [
    "Dressed for the Warm House, keeper? They're recruiting, you know.",
    "Priestess drapes! Whose god, keeper? Not Oden's, from the look of them.",
    "Veyra's look suits you. Not much of it, but it suits you.",
  ]),
  ...group("outfit.medieval", "outfit", (f) => f.outfit === "medieval", "happy", [
    "A proper dirndl! Like my nan wore. My nan was a legend, mind.",
    "Old-fashioned today, keeper? The farmers' wives approve. Their husbands more so.",
  ]),

  // ---- Public titles (WORLD.md 9) ----
  ...group("title.barmaid", "title", wearing("barmaid"), "happy", [
    "There's the Barmaid of the Pass! Fastest tray this side of the mountains.",
    "Barmaid of the Pass! Two ales and a smile, when you open.",
  ]),
  ...group("title.hearthKeeper", "title", wearing("hearthKeeper"), "happy", [
    "Keeper of the Hearth! Is it stew tonight? Say it's stew.",
    "The Keeper of the Hearth! My belly's been dreaming of your pot all week.",
  ]),
  ...group("title.untouchable", "title", wearing("untouchable"), "calm", [
    "Morning, Untouchable! Don't worry, I'm not touching.",
    "The Untouchable! My mate tried. He's still got the handprint.",
    ["Untouchable, they say. Bet I could. ...Not today. Today I'm busy.", { k: ["bandit", "soldier"] }],
  ]),
  ...group("title.ironHand", "title", wearing("ironHand"), "scared", [
    "The Iron Hand! Mind my face, I've only got the one.",
    "Soldiers cross the street when the Iron Hand walks by. I've seen it.",
  ]),
  ...group("title.everyonesDarling", "title", wearing("everyonesDarling"), "lust", [
    "Everyone's Darling! Am I everyone? I'd like to be everyone.",
    "Darling! Everyone's darling! Mine too, tonight?",
    "Here comes Everyone's Darling. Form an orderly queue, lads.",
  ]),
  ...group("title.unashamed", "title", wearing("unashamed"), "lust", [
    "Oi, Unashamed! Show us something!",
    "There goes Unashamed. Doesn't even blush. It's like weather.",
    ["Unashamed! A title the elves would die of. I'm thrilled for you.", { r: ["elf"] }],
  ]),
  ...group("title.baronsCreature", "title", wearing("baronsCreature"), "scheming", [
    "The Baron's Creature. Mind what you say, lads, it goes straight up the hill.",
    "Creature! Tell your master the toll's robbery. ...Actually, don't.",
  ]),
  ...group("title.prideOfTarven", "title", wearing("prideOfTarven"), "happy", [
    "Pride of Tarven! Three cheers! ...One cheer. It's early.",
    "Our pride! Our very own keeper! I'd vote for you. For anything.",
  ]),
  ...group("title.drinksThemUnder", "title", wearing("drinksThemUnder"), "happy", [
    "Drinks Them Under! The dwarves have heard. They're coming to settle it.",
    ["You drank the garrison under, they say. My clan's champion wants a word.", { r: ["dwarf", "orc"] }],
  ]),
  ...group("title.brawlQueen", "title", wearing("brawlQueen"), "scared", [
    "Champion of the brawl! Don't hit me, I'm only saying hello.",
    ["Queen of the Brawl! Hail, your majesty! Please don't hail me back.", { b: F }],
    ["Good fist on you, keeper. Spar with me at the yard? I'll hold back. A bit.", { k: ["soldier", "adventurer"], m: "happy" }],
  ]),
  ...group("title.nightChampion", "title", wearing("nightChampion"), "lust", [
    "Champion of the Night! The after-hours legend walks among us.",
    "Champion of the Night! Nobody's lasted against you yet, I hear. I'd try.",
  ]),
  ...group("title.lifeOfTheParty", "title", wearing("lifeOfTheParty"), "drunk", [
    "Life of the Party! You were under three tables last night. Three!",
    "Life of the Party! Is the party today? Where? Can I come?",
  ]),
  ...group("title.tableFavourite", "title", wearing("tableFavourite"), "lust", [
    "The Table's Favourite! Is there room at your table tonight?",
    "Favourite of the tables, keeper. I've a table. It's very sturdy.",
  ]),
  ...group("title.seasoned", "title", wearing("seasoned"), "happy", ["Seasoned Keeper. Now that's a proper keeper, that is."]),

  // ---- Passives a stranger can see, or has heard of ----
  ...group("passive.rear", "passive", has("cheeky", "pinchable", "admiredFromBehind", "boldBehind"), "lust", [
    "Can't keep my eyes off that rear, keeper. Nobody can. It's a public service.",
    "Pinchable, they say. Is it? ...I'm asking, not pinching.",
    "Walk slower, keeper. Some of us are admiring from behind.",
  ], "passive.lewd"),
  ...group("passive.chest", "passive", has("flushed", "proudChest", "shamelessBust", "needyChest"), "lust", [
    ["Chest out, keeper! The whole pass knows those two by name.", { b: F }],
    ["Every man in the square just looked at your front and then at his feet.", { b: F }],
    ["Proud chest on you, keeper. Proud as a rooster. Prouder.", { b: M }],
  ], "passive.lewd"),
  ...group("passive.hips", "passive", has("swayingHips", "hipsThatAsk", "looseHips", "easyWaist"), "lust", [
    "Hips like that, keeper, you'll knock a cart over.",
    "Those hips are asking a question, keeper. I'd like to answer it.",
  ], "passive.lewd"),
  ...group("passive.lap", "passive", has("lapWarmer", "perched", "openKnees"), "lust", [
    "Keeper! My lap misses you. It's been crying.",
    "Saved a knee for you tonight, keeper. The left one. It's the strong one.",
  ], "passive.lewd"),
  ...group("passive.kiss", "passive", has("stolenKiss", "sweetLips", "kissHungry", "softMouth"), "lust", [
    "Pucker up, keeper! Free kisses in the square? No? Worth asking.",
    "Kiss-hungry, they say. I've lips going spare.",
  ], "passive.lewd"),
  ...group("passive.mouth", "passive", has("eagerMouth", "practisedMouth", "cockHungry"), "lust", [
    "That mouth of yours is famous, keeper. And not for the speeches.",
    "Hungry, keeper? I've got a sausage for you. An actual sausage. Mostly.",
    "Heard you're hungry for cock, keeper. I've brought lunch.",
  ], "passive.lewd"),
  ...group("passive.inside", "passive", has("firstNight", "fromBehind", "bornRider", "insatiable"), "lust", [
    "Heard someone finally got all the way in, keeper. Congratulations. To him.",
    "Born rider, they say. I've a horse. And other things.",
    "Insatiable, I hear. Kevin's stamina finally met its match.",
    "Heard you like it from behind, keeper. I'll walk behind you, then.",
  ], "passive.lewd"),
  ...group("passive.show", "passive", has("peepShow", "flasher", "showOff", "exhibitionist", "bareAndBold", "bareShoulders"), "lust", [
    "Flash us, keeper! For luck! The farmers swear by it.",
    "Keeper! You served the whole room in your smalls, I hear. Encore?",
    "Lost any clothes yet today, keeper? It's still early.",
  ], "passive.lewd"),
  ...group("passive.room", "passive", has("openHouse", "wholeRoom", "wholeTable", "passedRound"), "lust", [
    "The whole taproom watched, keeper? On the table? I'd have paid double for a seat.",
    "Passed round the whole table, I heard. Like the salt.",
    "Keeper! Table for five tonight. We heard you do tables for five.",
  ], "passive.lewd"),
  ...group("passive.rough", "passive", has("likesItRough", "easyPrey", "stingingCheeks", "toughLove"), "lust", [
    "Likes it rough, they say. I'll be gentle anyway. Unless asked.",
    "Heard you like a firm hand, keeper. I've two. Both firm.",
  ], "passive.lewd"),
  ...group("passive.ache", "passive", has("aching", "nightlyRitual", "restlessHands", "alwaysWanting"), "lust", [
    "Your window was rattling again last night, keeper. Regular as the bell.",
    "Aching for it, are you? It shows, keeper. It shows all down the street.",
  ], "passive.lewd"),
  ...group("passive.slap", "passive", has("sharpPalm", "firmHand", "mistressOfTheBar", "sternKeeper", "rulesTheRoom"), "scared", [
    "Morning, keeper. My cheek still remembers your hand.",
    "That's the keeper who slapped Hobb into next week. Wave nicely, lads.",
  ], "passive.keeper"),
  ...group("passive.cold", "passive", has("coldShoulder", "untouchable", "iceQueen", "guarded", "firmNo"), "calm", [
    "Not even a hello, Ice Queen? ...Fair enough.",
    "Thirty hands and thirty no's, they say. I'll not be the thirty-first.",
  ], "passive.keeper"),
  ...group("passive.spotless", "passive", has("spotlessName", "ladyOfTheHouse"), "happy", [
    "Never let a hand near you, they say. Wren's own rule, in Wren's best days.",
    "Spotless, your name. My wife holds you up to her sisters. They're furious.",
  ], "passive.keeper"),
  ...group("passive.fighter", "passive", has("bouncer", "houseChampion", "heavyHand", "noTroubleHere", "wrestler"), "scared", [
    "Saw you throw that bandit through your door, keeper. Graceful.",
    ["Nobody starts trouble in your house, they say. I'll start it somewhere else.", { k: ["bandit"] }],
  ], "passive.fight"),
  ...group("passive.drink", "passive", has("ironLiver", "bottomless", "hollowLegs", "lastStanding"), "happy", [
    "Bottomless, they call you. The drinking, I mean. Mostly the drinking.",
    ["Iron liver, they say. Fight me. I mean drink me. I mean drink with me.", { r: ["dwarf"] }],
  ], "passive.drink"),
  ...group("passive.charm", "passive", has("winningSmile", "belleOfTheTavern", "silverTongue", "regularsFavourite"), "happy", [
    "That smile, keeper! The blacksmith's burnt himself again.",
    "Regulars' favourite! I'm a regular. Am I your favourite?",
  ], "passive.keeper"),
  ...group("passive.village", "passive", has("heartOfTheVillage", "safeHarbour", "keeperOfSecrets"), "happy", [
    "Heart of the village, you are. My wife says so, and she hates everyone.",
    "You kept my cousin's secret, keeper. Nobody here forgets that.",
  ], "passive.keeper"),
  ...group("passive.cook", "passive", has("stewKeeper", "neverBurns", "spotlessHouse"), "happy", [
    "Best stew on the pass, keeper. I'd marry it.",
    "Cleanest floor on the pass, keeper. My wife wants to know your secret.",
  ], "passive.keeper"),
  ...group("passive.shady", "passive", has("looseLips", "secretBroker", "baronsEar", "baronsPet", "coldHeart"), "scheming", [
    "Got any secrets for sale, keeper? I'm buying.",
    "Baron's pet! Wave to your master up on the hill.",
    "Cold heart, they say. Warm hands, though. I've heard.",
    ["Don't tell the keeper anything. It's on the market by noon.", { k: ["smuggler", "fugitive", "farmer"] }],
  ], "passive.shady"),

  // ---- Debuffs ----
  ...group("debuff.bruised", "debuff", debuffed("bruised"), "calm", [
    "That's a shiner, keeper. You should see the other fellow? I did. He's fine.",
    "Ooh, that bruise! Brawl? Or the fun kind?",
    "Put a cold steak on it, keeper. Then cook the steak.",
  ]),
  ...group("debuff.inDebt", "debuff", debuffed("inDebt"), "calm", [
    "Pell was asking after you, keeper. With his little book.",
    "How's the Baron's debt, keeper? Growing? Like my wart?",
    "Heard you owe the keep. Everyone owes the keep. Welcome to Tarven.",
  ]),
  ...group("debuff.watched", "debuff", debuffed("watched"), "scared", [
    "Soldiers at your door all night, keeper. Did you rob the Baron?",
    "Garrison raided you, I heard. Find anything? Besides Kevin?",
    ["The watch has your house on a list, keeper. Short list. Congratulations.", { k: ["soldier"], m: "scheming" }],
  ]),
  ...group("debuff.overwhelmed", "debuff", debuffed("overwhelmed"), "lust", [
    "Heard you lost your head at the after-hours game. The whole room cheered.",
    "You look like someone who said yes too many times in a row, keeper.",
  ]),

  // ---- The Lantern (STORY.md 12) ----
  ...group("lantern.lit", "lantern", (f) => f.lantern === "lit", "lust", [
    "Lantern's lit at your place, I hear. Proper red. Like in Wren's day.",
    "The red lamp's back on the pass! My grandad wept. With joy.",
    "The chapel's furious about your lantern, keeper. Pell's interested.",
    "What's the rate upstairs, keeper? Asking for a friend. The friend is me.",
    ["If the Lantern's hiring, keeper, I've a cousin. Very bendy.", { sex: "f", m: "happy" }],
    ["Velvet House says your red lamp's stealing their trade. Sabine's spitting pins.", { k: ["smuggler", "noble"] }],
  ]),
  ...group("lantern.dark", "lantern", (f) => f.lantern === "dark", "lust", [
    "Lantern's up but dark, keeper. Teasing us, are you?",
    "When's the red lamp lit, keeper? Half the garrison's asking.",
  ]),

  // ---- What she did at last call (plot.ts) ----
  ...group("plot.odenShut", "plot", flag("odenShut"), "angry", [
    "Chapel's shut. Somebody talked. You wouldn't know who, keeper?",
    "Oden's preaching in the street now. No roof. Louder, too.",
    ["Bottles cost more since the chapel shut. Silas's lot are sulking.", { k: ["smuggler"], m: "scheming" }],
  ]),
  ...group("plot.silasOwes", "plot", flag("silasOwes"), "scheming", [
    ["Silas says you're square with him, keeper. Square's rare, with Silas.", { k: ["smuggler"] }],
    "Enjoying the salt, keeper? Don't say where it came from.",
  ]),
  ...group("plot.silasAngry", "plot", flag("silasAngry"), "scheming", [
    ["Silas is asking who talked, keeper. Funny. He keeps asking about you.", { k: ["smuggler", "bandit"] }],
    "I'd not walk the quarry road, keeper. Silas has a long memory.",
  ]),
  ...group("plot.silasCame", "plot", flag("silasCame"), "scheming", [
    "Silas came in for his brawl at your place, I heard. Who won? ...Really?",
    ["Silas still talks about that night at yours. Fondly. That's worse.", { k: ["smuggler"] }],
  ]),
  ...group("plot.ashHidden", "plot", flag("ashHidden"), "scheming", [
    ["Your cellar's got lovely acoustics, keeper. Very quiet acoustics.", { k: ["fugitive", "smuggler"] }],
    ["A friend of mine says thank you, keeper. You know which friend.", { k: ["fugitive"], m: "happy" }],
  ]),
  ...group("plot.ashCaught", "plot", flag("ashCaught"), "scared", [
    ["You gave up the deserter. Folk like me walk wide of your door now.", { k: ["fugitive"] }],
    "Garrick rides by your door twice a day now. Paid well, was he?",
  ]),
  ...group("plot.maraArrested", "plot", flag("maraArrested"), "gloomy", [
    ["Mara's chair's empty. The farmers know who to thank.", { k: ["farmer"], m: "angry" }],
    "The farmers miss Mara. They don't miss her soup. They miss Mara.",
  ]),
  ...group("plot.rheaDoubts", "plot", flag("rheaDoubts"), "scheming", [
    ["The captain didn't march. The lads say you had a word.", { k: ["soldier"] }],
    "Rhea's been very thoughtful since you talked. It's frightening.",
  ]),
  ...group("plot.defiedPell", "plot", flag("defiedPell"), "happy", [
    "You threw Pell out! In his good coat! The whole town's toasting you.",
    "Pell's still telling people he tripped. He didn't trip, did he, keeper?",
    "Threw the Baron's man into the snow! Wren's {grandchild}, all right.",
  ]),
  ...group("plot.pellsEar", "plot", flag("pellsEar"), "scheming", [
    "Pell comes out of your place smiling, keeper. Pell never smiles.",
    ["Mind what you say near the tavern, lads. The keeper's got Pell's ear.", { k: ["smuggler", "fugitive", "farmer"] }],
  ]),
  ...group("plot.deniedLantern", "plot", and(flag("deniedLantern"), late), "happy", [
    "A respectable house, you told Tansy? Tansy's still laughing, keeper.",
  ]),
  ...group("plot.heardSilver", "plot", flag("heardSilver"), "scheming", [
    "The Baron's short of silver, they say. Where's it going? A gold statue, I bet.",
  ]),

  // ---- Corruption, trust, willpower, fans ----
  ...group("corruption", "corruption", (f) => f.corruption >= 50, "scheming", [
    "Morning, keeper. Who are you selling today?",
    "Smile like a knife, that one. Wren's eye for coin.",
    "They say you'd sell your own bed and charge for the sheets.",
    "Don't shake the keeper's hand. Count your fingers after.",
    ["Keeper. If you're buying names, I'm selling. Cheap, for you.", { k: ["smuggler", "bandit"] }],
    ["There goes the Baron's favourite. Keep walking, everyone.", { w: (f) => f.corruption >= 80 }],
  ]),
  ...group("trust.hi", "trust", (f) => f.trust >= 10, "happy", [
    "Morning, keeper! My mother says you're the best thing since Wren.",
    "If the Baron comes for your tavern, he'll find the whole village in the way.",
    "You're one of us now, keeper. Bram's goat agrees.",
    ["Need a hand with the casks tonight, keeper? Free. Don't argue.", { k: ["farmer"] }],
  ]),
  ...group("trust.lo", "trust", (f) => f.trust <= 2 && f.day >= 2, "calm", [
    "Who's this, then? ...Oh. The keeper. Hm.",
    "Nobody's vouched for you yet, keeper. Give it time. Or a free ale.",
  ]),
  ...group("will", "will", (f) => f.willpower < 0.25, "calm", [
    "You look done in, keeper. A candle at both ends.",
    "Long night? You look like you'd say yes to anything. Er. Rest, I mean.",
    "Get some sleep, keeper. You look like a wrung-out dishrag.",
  ]),
  ...group("fans.hi", "fans", (f) => f.fans >= 100, "idolize", [
    "A hundred fans, keeper! My cousin's one. He's insufferable about it.",
    ["Three hundred fans, they say. The Copper Bell's spitting feathers.", { w: (f) => f.fans >= 300 }],
    ["The adventurers' guild talks about your place now. Expect loud ones.", { w: (f) => f.fans >= 300 }],
  ]),
  ...group("fans.lo", "fans", (f) => f.fans < 10 && f.day >= 3, "gloomy", [
    "Your tavern's the one with the empty chairs? Lovely chairs.",
  ]),

  // ---- The hour (flavour) ----
  ...group("time.morning", "time", (f) => f.hour < 11, "calm", [
    "Morning, keeper. Early for you, isn't it?",
    "Bread's fresh at Tansy's, keeper. Get there before the soldiers.",
    "Market's just opening, keeper. Cheap flour if you're quick.",
    "Morning! You look like someone who slept on a bar stool.",
    "The rooster's been at it since five. The bird, I mean.",
  ]),
  ...group("time.noon", "time", (f) => f.hour >= 11 && f.hour < 14.5, "calm", [
    "Hot one today, keeper.",
    "Lunch, keeper? Or saving yourself for the stew?",
    "Noon bell's gone, keeper. Half the day's spent.",
  ]),
  ...group("time.afternoon", "time", (f) => f.hour >= 14.5 && f.hour < 16, "calm", [
    "Afternoon, keeper. Sun's going over the keep already.",
    "Not long till your doors open, keeper. Save me a stool.",
  ]),
  ...group("time.late", "time", (f) => f.hour >= 16, "calm", [
    "Shouldn't you be opening, keeper?",
    "Nearly five! Your doors open soon? I'm parched.",
    "Bell's at five, keeper. Run!",
    "Keeper! What are you still doing out here? I'm thirsty!",
  ]),

  // ---- Who's talking (flavour) ----
  ...group("kind", "kind", undefined, "calm", [
    ["Turnips are up two coppers. The Baron again.", { k: ["farmer"] }],
    ["Rain's coming. My knee says so, and my knee's never wrong.", { k: ["farmer"] }],
    ["Morning, keeper. Cow's poorly. Don't ask.", { k: ["farmer"], m: "gloomy" }],
    ["Move along, citizen. ...Oh, it's you, keeper. Move along slower.", { k: ["soldier"] }],
    ["Drill at noon in the yard, keeper. Come watch. The lads show off.", { k: ["soldier"] }],
    ["Captain says no drinking on duty. I'm off duty in my heart.", { k: ["soldier"] }],
    ["Nice day for it, keeper. For what? Exactly.", { k: ["smuggler"], m: "scheming" }],
    ["If anyone asks, you never saw me. Hello, keeper.", { k: ["smuggler"] }],
    ["Need anything that fell off a cart, keeper? Carts are very clumsy lately.", { k: ["smuggler"] }],
    ["Sorry. Sorry. Just passing. Please don't look at me.", { k: ["fugitive"], m: "scared" }],
    ["Is the gate watched today, keeper? Asking for... nobody.", { k: ["fugitive"], m: "scared" }],
    ["We killed a slime, keeper! Small one. Still counts.", { k: ["adventurer"], m: "happy" }],
    ["Off to the north road! Keep us a bed, keeper, we'll be back rich!", { k: ["adventurer"], m: "happy" }],
    ["Nice street. Be a shame if... no. I'm off duty. Morning.", { k: ["bandit"] }],
    ["Corran says hello. Corran never says hello. Be worried.", { k: ["bandit"], m: "scheming" }],
    ["Do they ever sweep this street? Or merely look at it?", { k: ["noble"] }],
    ["The signal up here is barbaric. Pell probably reads the messages slowly.", { k: ["noble"] }],
  ]),

  // ---- Their people (flavour; WORLD.md 7b) ----
  ...group("race", "race", undefined, "calm", [
    ["Your ale is a crime, keeper, and I shall return to commit it nightly.", { r: ["elf"] }],
    ["An elf courts for a season. I've been courting your stew for a week.", { r: ["elf"] }],
    ["Good stone under this mud. Dwarf-laid. Show it some respect.", { r: ["dwarf"] }],
    ["Drinking contest tonight, keeper? I'll bring my aunt. Undefeated.", { r: ["dwarf"], m: "happy" }],
    ["Keeper. Good morning. I say it loud so you know I mean it.", { r: ["orc"] }],
    ["My clan says your stew is weak. I had three bowls. To be sure.", { r: ["orc"] }],
    ["Wind's turning, keeper. My ears say rain. My tail says ale.", { r: ["beastfolk"] }],
    ["Sorry, keeper, my tail knocked your basket. It does what it likes.", { r: ["beastfolk"] }],
    ["Phone charms! Mana-stones! Cheap! For you, keeper, cheaper!", { r: ["goblin"], m: "scheming" }],
    ["Your phone's cracked, keeper. I can tell from here. Two silver, fixed.", { r: ["goblin"], m: "scheming" }],
    ["Goblins in the market again. Sold me a phone that works. Suspicious.", { r: ["human"], m: "angry" }],
    ["Orcs at the gate! ...Oh. They're queuing politely. Hmph.", { r: ["human"], m: "angry" }],
  ]),

  // ---- The town (flavour; WORLD.md) ----
  ...group("street", "street", undefined, "calm", [
    "Seen the feed? Someone saw the Queen at the Copper Bell. In a wig.",
    "Relay's slow today. Pell must be reading the long ones.",
    "Never text what you can whisper, keeper. Tarven's rule.",
    "Is Kevin still on the Crown's tab at your place? The Crown'll never pay.",
    "Zane's in town, they say. Hide anything you don't want on the feed.",
    "Somebody's put a poster up for the Warm House. It's mostly a picture.",
    "Mana-stones are up again. My phone's on one bar and a prayer.",
    "A goblin sold me a speaker. It plays one song. It's the rude one.",
  ]),
];


// ---------- Her answers ----------

/** A pool of her answers: by stage, by early/late, or for any stage. A line in parentheses is a thought. */
type ReplyPool = Partial<Record<ArcStage | "early" | "late" | "any", readonly string[]>>;

/** What she says or thinks back, by reply key (a group's prefix, or a shared key). Keys fall back by dropping a part. */
const BASE_REPLIES: Readonly<Record<string, ReplyPool>> = {
  "arc.sheltered": {
    any: [
      "(Don't blush. Don't blush. ...I'm blushing.)",
      "(Is that what people say to each other up here?)",
      "(Mother would faint. Mother would faint and then pray.)",
      "(Smile and keep walking. Smile and keep walking.)",
      "G-good morning!",
    ],
  },
  "arc.curious": {
    any: [
      "(I didn't hate that. I should have hated that.)",
      "(Why am I smiling? Stop smiling.)",
      "Maybe it is the weather.",
      "(They're looking. I... don't mind them looking.)",
    ],
  },
  "arc.willing": {
    any: ["Come in tonight and find out.", "Ask nicely. Bring coin.", "(Let them talk. Talk sells ale.)", "Corner table's extra. Worth it."],
  },
  "arc.known": {
    any: [
      "Tonight, love. Bring friends.",
      "(Half this street's had a hand on me. The other half's saving up.)",
      "Wave if you were there last night. ...That's a lot of waving.",
      "Doors at five. Queue starts at four.",
    ],
  },
  "arc.legend": {
    any: [
      "Five o'clock, darlings. Bring the drum.",
      "(They know all the words. So do I. I'm word perfect.)",
      "Louder! I can't hear my name!",
      "(Shame used to live here. I think she moved to the Copper Bell.)",
    ],
  },
  "arc.rotten": { any: ["Everything costs. You'd know.", "(They're right. I'd sell the sheets too.)", "Price went up when you asked."] },
  "respect.hi": {
    early: ["Oh! Thank you. Truly.", "(They mean it. They actually mean it.)", "Wren's chin, Wren's manners. I hope."],
    late: ["Thank you. Tell your friends the room's fair.", "(Respect and a reputation. Grandma managed both.)"],
  },
  "respect.lo": {
    sheltered: ["(Who says that? Who says that out loud?)", "I-I beg your pardon!"],
    curious: ["(My face is burning. So is something else.)", "That's not... I'm not..."],
    willing: ["More than you've got, love.", "(Fair. Rude, but fair.)"],
    known: ["Afternoon's booked. Try tonight.", "Cheaper if you stop talking."],
  },
  fame: {
    early: ["(People know my face. My face!)", "Me? Oh. Um. Hello!", "(Do I smile for the phone? I'm smiling.)"],
    late: ["Tag the tavern, love.", "(Every photo's a guest tonight.)", "Get my good side. Both are good."],
  },
  "mess.smell": {
    sheltered: ["(Do I smell? I smell. Oh gods, I smell.)", "I— I was helping with the goats!"],
    curious: ["(I washed! Twice! Didn't I?)", "Don't sniff me!"],
    willing: ["Long night. Good tips.", "(Bath first, next time. Probably.)"],
    known: ["That's the smell of a full purse.", "Come in tonight and add to it."],
  },
  "fame.nobody": { any: ["(Ouch.)", "There's a tavern. It's mine. Come and see.", "(We'll see who's asking in a month.)"] },
  "lust.want": {
    sheltered: ["(Is it that obvious? Gods, it's that obvious.)", "It's... warm today. That's all."],
    curious: ["(I can't stop thinking about it. Whatever it is.)", "Mind your own sausages."],
    willing: ["Tonight. If you're quick.", "(Very obvious. Fine.)"],
    known: ["Bring it tonight and we'll see.", "(I'm aching just walking to market. Lovely.)"],
  },
  "lust.flirt": {
    early: ["(I only smiled. Did I wink? I might have winked.)", "Was I flirting? I wasn't flirting."],
    late: ["Morning, handsome.", "Wink back, then. Coward."],
  },
  drunk: {
    early: ["I'm fine! The street's moving.", "(One drink. It was one. Or six.)", "Don't tell Mother."],
    late: ["Hair of the whole dog, love.", "(Bar opens in a few hours. Pace yourself.)", "Hic. Morning."],
  },
  mess: {
    sheltered: ["(Oh gods. Oh gods, is that... I washed! I thought I washed!)", "It's... porridge."],
    curious: ["(I forgot. How did I forget THAT?)", "Don't. Look. At me."],
    willing: ["Long night. Good tips.", "(Bath. Then market. Wrong order.)"],
    known: ["Souvenir. Want a closer look?", "(Leave it. It's advertising.)", "You should see the other ones."],
  },
  dress: {
    sheltered: ["(Cover up cover up cover up.)", "It's NOT a decision!"],
    curious: ["(Everyone's looking. Why don't I mind more?)", "It was a dare. Several dares."],
    willing: ["Look all you like. Touching's tonight.", "(Free advertising.)"],
    known: ["The tavern opens at five. So does the rest of me.", "(Let them look. They'll pay later.)"],
  },
  "dress.naked": {
    sheltered: ["(I am naked. In the street. I am naked in the STREET.)", "Please don't— don't look!"],
    curious: ["(Breathe. Walk. Don't run, running bounces.)", "Not one word."],
    willing: ["Clothes are for people who owe money. ...Oh, wait.", "(Cold. Free. Mostly cold.)"],
    known: ["Like what you see? Doors at five.", "(Half of them have seen it already.)"],
  },
  outfit: {
    early: ["(I knew this was too much.)", "It was this or the apron."],
    late: ["It's working, isn't it?", "(Every look's a guest tonight.)"],
  },
  title: {
    early: ["(How do they know that? Who's telling them?)", "Please don't call me that in the street."],
    late: ["That's me.", "Earned it.", "(Wear it loud, they'll come in to see if it's true.)"],
  },
  "title.untouchable": { any: ["Keep it that way.", "(Good. Spread it.)"] },
  "title.ironHand": { any: ["Only if you earn it.", "(Pike flinched. I saw.)"] },
  "title.baronsCreature": { any: ["(Let them whisper. Whispers pay.)", "My master says hello."] },
  "title.prideOfTarven": { any: ["You lot make it easy.", "(Grandma, they're cheering. Can you hear?)"] },
  "passive.lewd": {
    sheltered: ["(How does everyone KNOW?)", "That's not— that was one time!"],
    curious: ["(It was more than once. They know it was more than once.)", "Gossips. The lot of you."],
    willing: ["Tonight. Bring coin.", "(True. All true.)"],
    known: ["Word gets round. So do I.", "(They're not wrong.)", "Come in and see."],
  },
  "passive.keeper": {
    early: ["(A good name. Keep it.)", "Thank you. I try."],
    late: ["Wren's rule, my rule.", "(Good. Let them think I'm all business.)"],
  },
  "passive.fight": { any: ["He started it.", "Mind your manners and you'll never find out.", "(Knuckles still ache. Worth it.)"] },
  "passive.drink": { any: ["Bring your best. Bring two.", "(The dwarves will be the end of me.)"] },
  "passive.shady": { any: ["Depends what you've got.", "(Everyone talks. I just listen for money.)", "Careful what you say near me."] },
  debuff: {
    early: ["(Smile. Pretend it's fine.)", "I'm fine! Really."],
    late: ["Don't worry about me.", "(It'll pass. Everything passes.)"],
  },
  "debuff.bruised": { any: ["You should see him.", "(Ow. Still ow.)", "Fell into a fist."] },
  "debuff.inDebt": { any: ["(One more night. One more good night.)", "He'll get paid. Eventually.", "Tell Pell to count slower."] },
  "debuff.watched": { any: ["Nothing to find.", "(Except what's in the cellar. Smile.)", "They liked the stew, at least."] },
  "debuff.overwhelmed": {
    early: ["(I don't want to talk about it.)", "That's— nobody saw that."],
    late: ["Worth it.", "(I'd do it again. I will do it again.)"],
  },
  lantern: {
    early: ["(It's just a lamp. A red lamp. A very red lamp.)", "It's a respectable house!"],
    late: ["Ask at the bar after dark.", "(Grandma's lamp. Grandma's trade.)", "Rates are on the door. Bring silver."],
  },
  plot: { any: ["(Smile. Say nothing.)", "I don't know what you mean.", "(Never text what you can whisper. Or say it in the street.)"] },
  "plot.defiedPell": { any: ["He tripped. Over my boot.", "(Best morning of my life.)"] },
  "plot.odenShut": { any: ["(Don't look at the chapel. Don't look.)", "Terrible business."] },
  corruption: { any: ["Who's buying?", "(Count my fingers? Count yours.)", "Everyone has a price. Mine's just posted."] },
  trust: { any: ["You're good people. All of you.", "(Home. This is home now.)", "Come by tonight. First cup's mine."] },
  "trust.lo": { any: ["(Give it time.)", "First ale's free. Come and judge me."] },
  will: { any: ["(Bed. Bed would be good.)", "I'm fine. Mostly upright."] },
  fans: { any: ["Tell your friends. Tell your enemies.", "(Every one of them's a full cup.)"] },
  "fans.lo": { any: ["(Not yet. Not yet.)", "They'll fill. You'll see."] },
  time: { any: ["Morning.", "On my way.", "(Five o'clock. Don't forget five o'clock.)"] },
  "time.late": { any: ["Going, going!", "(Late! Late, late, late.)"] },
  kind: { any: ["Morning.", "(Tarven. Never boring.)", "Good luck with that."] },
  race: { any: ["Morning to you too.", "(I love this town. Mostly.)"] },
  street: { any: ["(Pell reads everything. Remember that.)", "Huh.", "Typical Tarven."] },
};

/** Her answer to a line, by key and stage, or null when there's none. */
function replyPool(key: string, stage: ArcStage): readonly string[] | null {
  let at: string | null = key;
  while (at) {
    const pool = REPLIES[at];
    const lines = pool && (pool[stage] ?? pool[talkStage(stage)] ?? pool[stageIndex(stage) <= 1 ? "early" : "late"] ?? pool.any);
    if (lines && lines.length > 0) return lines;
    const cut = at.lastIndexOf(".");
    at = cut > 0 ? at.slice(0, cut) : null;
  }
  return null;
}

// ---------- Two-line exchanges (when she stops to talk) ----------

export interface TownExchange extends Gate {
  id: string;
  category: TownCategory;
  when?: When;
  mood: Mood;
  /** What they open with. */
  npc: string;
  /** Her answer, by stage. */
  her: Stage4;
  /** Their comeback: the same whatever her stage, by stage, or none. */
  back?: string | Stage4;
}

function ex(id: string, category: TownCategory, when: When | undefined, mood: Mood, npc: string, her: Stage4, back?: string | Stage4, gate: Gate = {}): TownExchange {
  return { id: `ex.${id}`, category, when: and(when, gate.w), mood, npc, her, back, ...gate };
}

/** What a townsperson she stops to talk to says, her answer, and theirs. */
const BASE_EXCHANGES: readonly TownExchange[] = [
  ex("settling", "arc", undefined, "calm", "Keeper! Settling in all right up here?", [
    "Y-yes! Everyone's very... friendly.",
    "Better every night. Strange, that.",
    "Nights are good. Mornings are sore.",
    "Settled? I run the place, love.",
  ], "Mind the friendly ones."),
  ex("tonight", "arc", undefined, "happy", "What's on at your place tonight, then?", [
    "Stew! And... ale. Stew and ale. That's all. Honest.",
    "Stew, ale, and whatever the soldiers start.",
    "Stew, ale, and me, if you're early.",
    "Whatever you're paying for.",
  ], ["Stew it is.", "I'll start something.", "I'll be early.", "I'll bring my purse. Both purses."]),
  ex("wren", "arc", undefined, "calm", "You're more like Wren every day, keeper.", [
    "Grandma kept a respectable house!",
    "Which part of Wren? Don't answer that.",
    "The part with the lantern, you mean.",
    "Wren would've charged you for saying so.",
  ], ["Course she did, love.", "The best part.", "The best part.", "She would. She did."]),
  ex("kiss", "arc", stage("sheltered", "curious"), "lust", "Give us a kiss for luck, keeper?", [
    "I— no! Not in the street! Not anywhere! Probably.",
    "(Would I? ...Not here.) Not here.",
    "", "",
  ], "Worth asking.", { sex: "m" }),
  ex("price", "arc", late, "lust", "So what's it cost, keeper? Straight answer.", [
    "", "",
    "Depends what you're buying. Come tonight and ask nicely.",
    "More than you've got. Less than you'd pay.",
  ], ["", "", "I'll ask very nicely.", "I'll pay it twice."]),
  ex("lap", "arc", late, "lust", "Saving my seat? The one on your lap?", [
    "", "",
    "If you're there by six.",
    "Queue starts at five. Bring a cushion.",
  ], "I'll be there at four.", { sex: "m" }),
  ex("wife", "arc", stage("willing", "known"), "happy", "My husband won't stop talking about you.", [
    "", "",
    "Good things, I hope?",
    "Bring him in. Bring yourself.",
  ], ["", "", "Things. Lots of things.", "...I might."], { sex: "f" }),
  ex("respectHi", "respect", (f) => f.respect >= 4, "happy", "My sister wants to work for you, keeper. Proper work.", [
    "I'd be honoured. Truly.",
    "Send her by. I'll keep an eye.",
    "Proper work, I promise. Mostly trays.",
    "Proper work. I'll see she's never pushed.",
  ], "That's all I ask."),
  ex("respectLo", "respect", (f) => f.respect <= -3, "lust", "Oi, keeper! How much for a go?", [
    "How DARE you!",
    "(My heart's going.) Not for sale!",
    "Not out here. Tavern. Tonight.",
    "More than your wages. Save up.",
  ], ["Worth a try.", "Worth a try.", "I'll be there.", "I've been saving since spring."]),
  ex("fame", "fame", (f) => f.fame >= 30, "idolize", "Can I take a photo? For the feed?", [
    "Oh! Um. All right. Is my hair...?",
    "Quickly! Before I go red.",
    "Tag the tavern. And get the good side.",
    "One. And then you're buying a drink tonight.",
  ], "Four thousand hearts by dark, I promise."),
  ex("mess", "mess", (f) => f.messy || f.stained, "happy", "Keeper... you've got a bit of something. There. And there.", [
    "(No. No no no.) Thank you! Excuse me!",
    "I— thank you. I'll just... thank you.",
    "Leftovers. Long night.",
    "I know. I'm saving it.",
  ], ["Bathhouse is left.", "Bathhouse is left.", "Must've been some night.", "...Right you are."]),
  ex("smell", "mess", (f) => f.smellsOfSex, "happy", "Did you... come straight from the tavern, keeper?", [
    "Is it that obvious?",
    "(It's that obvious.) I'm on my way to wash.",
    "Straight from bed, more like.",
    "Straight from three beds. Smell for yourself.",
  ], "Wind's in my favour, then."),
  ex("dressed", "dress", (f) => f.dress !== "dressed" && f.dress !== "missingPiece", "lust", "Forget something this morning, keeper?", [
    "My clothes. Don't look. Please don't look.",
    "A dare. Several dares. Don't ask.",
    "Didn't forget. Decided.",
    "Did I? Count again.",
  ], ["Not looking!", "Wasn't going to!", "Good decision.", "Counting slowly."]),
  ex("drunk", "drunk", (f) => f.drunk >= 0.5, "drunk", "Steady, keeper! Had a few?", [
    "Just one! Just... a few ones.",
    "A few. A few and a few.",
    "Had a few. Want a few?",
    "I've had all of them. Bar's open early.",
  ], "Lean on me, then. Just to the well."),
  ex("lantern", "lantern", (f) => f.lantern === "lit", "lust", "Is it true about the red lamp, keeper?", [
    "It's... it's a lamp.",
    "It's a lamp! It's... a red lamp.",
    "Come see for yourself.",
    "True as silver. Bring some.",
  ], "I'll bring all of it."),
  ex("untouchable", "title", wearing("untouchable"), "calm", "Is it true nobody's laid a hand on you, keeper?", [
    "Nobody. Nobody at all.",
    "Nobody I let.",
    "Nobody I didn't want to.",
    "Nobody who didn't pay.",
  ], "I'll keep mine in my pockets, then."),
  ex("unashamed", "title", wearing("unashamed"), "lust", "Don't you ever blush, keeper?", [
    "Always! Constantly!",
    "Less than I used to.",
    "Not since spring.",
    "Only when I'm bored.",
  ], "Gods help us."),
  ex("pride", "title", wearing("prideOfTarven"), "happy", "Pride of Tarven! What's the secret?", [
    "Being kind. And the stew.",
    "Kindness. And salt.",
    "Fair prices. Long nights.",
    "Give them what they come for.",
  ], "Wren said the same."),
  ex("debt", "debuff", debuffed("inDebt"), "calm", "Pell's been round, keeper. Says you're short.", [
    "I'll find it. I will.",
    "He'll be paid. Tell him that.",
    "He'll be paid. Slowly.",
    "Tell Pell he knows where to find me. Everyone does.",
  ], "I'll pass it on. Quietly."),
  ex("bruised", "debuff", debuffed("bruised"), "calm", "Gods, keeper, who gave you that eye?", [
    "A brawl. I'm all right.",
    "A brawl. I lost. Mostly.",
    "A brawl. I lost. The fun way.",
    "A brawl. I'll win the next one.",
  ], "Put meat on it."),
  ex("odenShut", "plot", flag("odenShut"), "angry", "Oden's chapel is dark. You know anything about that?", [
    "No! I... no.",
    "Nothing. I know nothing.",
    "I know a lot of things.",
    "I know who paid, and who didn't.",
  ], "Hm. The chapel will remember."),
  ex("pellOut", "plot", flag("defiedPell"), "happy", "Did you really throw Pell into the snow?", [
    "He fell. Near my boot.",
    "He fell. Near my boot. Twice.",
    "Face first. In his nightshirt.",
    "And I'd do it again for coin.",
  ], "Best news all winter."),
  ex("silver", "plot", flag("heardSilver"), "scheming", "Where does the Baron's silver go, d'you think?", [
    "I couldn't guess.",
    "Somewhere shiny.",
    "Somewhere he can look at it. Himself, probably.",
    "Into a statue of himself. Big one. Ask Old Hollis.",
  ], "Ha! Don't say that by the relay."),
  ex("farmer", "kind", undefined, "calm", "Can you use cheap turnips tonight, keeper?", [
    "Oh, yes please!",
    "How cheap?",
    "Cheap and fresh? I'll take a sack.",
    "Throw in a smile and I'll take two.",
  ], "Done. Mara's prices, mind.", { k: ["farmer"] }),
  ex("soldier", "kind", undefined, "calm", "Keeper. Any trouble at your place, you send for us.", [
    "Thank you, sir!",
    "I'll send for Rhea.",
    "I'll send for you. You specifically.",
    "Trouble's what I'm good at. But thanks.",
  ], ["Ma'am.", "Even better.", "...Right. Good. Yes.", "Don't I know it."], { k: ["soldier"] }),
  ex("smuggler", "kind", undefined, "scheming", "Need salt, keeper? Very good salt. No questions.", [
    "I— is it allowed?",
    "How much? Quietly.",
    "Leave it by the back door.",
    "Under the cellar step. Usual price.",
  ], "Never saw me.", { k: ["smuggler"] }),
  ex("fugitive", "kind", undefined, "scared", "Is there a back room at your place? Somewhere quiet?", [
    "Come at dusk. I'll find something.",
    "There's a cellar. Nobody asks.",
    "There's a cellar. And a room upstairs.",
    "Cellar's free. Upstairs costs.",
  ], "Thank you. Truly.", { k: ["fugitive"] }),
  ex("adventurer", "kind", undefined, "happy", "Keeper! Will you post our job on your board?", [
    "Of course! What is it?",
    "If it's not slimes again.",
    "If you drink at mine after.",
    "If the party pays the board tax. In ale.",
  ], "Slimes. It's always slimes.", { k: ["adventurer"] }),
  ex("noble", "kind", undefined, "calm", "Innkeeper. Is your best room clean?", [
    "Very clean! I scrubbed it myself.",
    "Clean as a chapel.",
    "Clean every morning. Busy every night.",
    "Clean for you. Dirty for extra.",
  ], ["Adequate.", "Adequate.", "...Book it.", "...Book it. Discreetly."], { k: ["noble"] }),
  ex("bandit", "kind", undefined, "scheming", "Corran wants a word about protection, keeper.", [
    "I— I'll need to think about it.",
    "From what? From you?",
    "Tell Corran I protect myself.",
    "Tell Corran my fists cost less than his lads.",
  ], "He won't like that.", { k: ["bandit"] }),
  ex("orc", "race", undefined, "calm", "Keeper. I like your tavern. I will drink there. Yes?", [
    "Y-yes! Please do!",
    "Yes. Leave the axe at the door.",
    "Yes. And maybe more than drink.",
    "Yes. Bring your whole clan.",
  ], "Good. Orcs keep promises.", { r: ["orc"] }),
  ex("goblin", "race", undefined, "scheming", "Keeper! Phone charm, shaped like your tavern. Ten silver!", [
    "Ten? That's... a lot.",
    "Five.",
    "Three, and I'll put a sign up for you.",
    "Two, and you sell them at my bar. Half each.",
  ], "Deal! You're worse than my mother!", { r: ["goblin"] }),
  ex("elf", "race", undefined, "calm", "Your establishment is rustic. I find I keep returning to it.", [
    "Thank you? I think?",
    "That's the ale talking.",
    "That's not the ale, is it.",
    "Everyone keeps returning. Nobody knows why.",
  ], "A mystery. I shall study it. Nightly.", { r: ["elf"] }),
  ex("dwarf", "race", undefined, "happy", "Drinking contest, keeper. You and me. Tonight.", [
    "Oh, I couldn't!",
    "One round. Just one.",
    "Loser pays. Winner chooses.",
    "Bring your whole hall. I'll drink it dry.",
  ], "Ha! I like you.", { r: ["dwarf"] }),
  ex("late", "time", (f) => f.hour >= 16, "calm", "Keeper! Aren't you opening tonight?", [
    "Yes! I'm going! I'm late!",
    "On my way. Save me from the soldiers.",
    "On my way. Bring the soldiers.",
    "Doors at five. Bring everyone.",
  ], "I'll be first in."),
  ex("market", "time", (f) => f.hour < 14, "calm", "Shopping for tonight, keeper?", [
    "Flour, and meat, and... I've lost the list.",
    "Flour and casks. And a new apron.",
    "Flour, casks, and something for the back room.",
    "Casks. Lots of casks. It's going to be a loud one.",
  ], "Busy night, then."),
  ex("feed", "street", undefined, "calm", "Did you see what Zane posted this morning?", [
    "I don't... is it about me?",
    "If it's about me, I don't want to know.",
    "If it's about me, did it get hearts?",
    "Was it me? It's usually me.",
  ], ["No! A goat.", "It's a goat. Relax.", "It's a goat. Sorry.", "It's a goat. You're second."]),
  ex("fair", "street", undefined, "happy", "Bram's Fair's coming. Will your place do a dare night?", [
    "Dares? I... we'll see.",
    "A small one. Small dares.",
    "Dares, dice, and nobody goes home dressed.",
    "Every night's a dare night at mine.",
  ], "Ha! Bram would approve."),
  ex("queen", "street", undefined, "calm", "Is it true the Queen's been seen in Tarven? In a wig?", [
    "The Queen? Here? Surely not.",
    "In a wig? Which wig?",
    "Tell her my door's open.",
    "If she comes, she'll find what she's looking for.",
  ], "Ha! Nobody believes it."),
  ex("kevin", "street", undefined, "calm", "Has the Hero gone east yet, keeper?", [
    "He's still in the taproom. Resting.",
    "He's preparing. Very slowly.",
    "He's preparing. With great stamina.",
    "The Crown's tab's longer than the pass. He's staying.",
  ], "The Crown'll never pay."),
];

/** The stage's half of an exchange, or none when it's left empty for that stage. */
function exchangeHer(e: TownExchange, s: ArcStage): string {
  return e.her[stageIndex(s)];
}

// ---------- Townsfolk talking among themselves ----------

export interface TownChat extends Gate {
  id: string;
  category: TownCategory;
  when?: When;
  /** Who says the first line (`k`, `r`, `sex` are about them); the lines take turns from there. */
  lines: readonly string[];
  aboutYou: boolean;
  /** Said so she'll hear it: they don't drop their voices when she's near. */
  loud?: boolean;
}

function chats(prefix: string, category: TownCategory, when: When | undefined, aboutYou: boolean, entries: readonly (readonly string[] | readonly [readonly string[], Gate & { loud?: boolean }])[]): TownChat[] {
  return entries.map((entry, i) => {
    const plain = typeof entry[0] === "string";
    const lines = (plain ? entry : entry[0]) as readonly string[];
    const { loud, w, ...gate } = (plain ? {} : entry[1]) as Gate & { loud?: boolean };
    return { id: `chat.${prefix}.${i}`, category, when: and(when, w), lines, aboutYou, loud, ...gate };
  });
}

/** Two townsfolk, standing together. */
const BASE_CHATS: readonly TownChat[] = [
  // About her, by her stage.
  ...chats("sheltered", "arc", stage("sheltered"), true, [
    ["That's the new keeper. Wren's {grandchild}.", "Looks like a strong wind'd blow {her} back down the valley.", "Give it a week."],
    ["Said good morning to the keeper. Went red as a beet.", "Sweet.", "Wren never went red in her life."],
    ["The lads have a pool on the keeper's first smile.", "Who's winning?", "Nobody. Not a smile. Not one."],
    [["Morning, keeper! ...See? Red. Told you.", "Leave {her} be.", "I'm being friendly!"], { loud: true }],
  ]),
  ...chats("curious", "arc", stage("curious"), true, [
    ["Saw the keeper let the smuggler hold {hers} hand.", "Hold {hers} hand!", "I know. In front of everyone."],
    ["They say the keeper's warming up.", "Warming up to what?", "To whom. That's the bet now."],
    ["Did the keeper just smile at you?", "At me? ...At me!", "Steady. It was at the bread."],
  ]),
  ...chats("willing", "arc", stage("willing"), true, [
    ["Ask for the keeper by name, they say.", "And then?", "And then bring coin. A lot of coin."],
    ["Went upstairs at Wren's place last night.", "Wren's place? The keeper?", "Came down a new man. Two new men, actually."],
    ["My husband's at the tavern every night now.", "For the ale?", "He hates ale.", "Ah."],
    [["Oi, keeper! My mate wants to know if you're free tonight!", "I never said that!", "He did. He's shy."], { loud: true }],
  ]),
  ...chats("known", "arc", stage("known"), true, [
    ["Half the pass has had the keeper, they say.", "Only half?", "The other half's coming up for the fair."],
    ["Travellers ask the way to the keeper's bed now.", "Not the tavern?", "Same building. Different queue."],
    ["Don't bother with the stew at the keeper's.", "Why not?", "Nobody goes for the stew."],
    [["There {she} goes. Best ride on the pass.", "Shh! {She}'ll hear.", "{She} likes hearing it. Look, {she}'s smiling."], { loud: true }],
    ["Saw the keeper on the feed last night. Every bit of {her}.", "Every bit?", "Zane got the angles. Zane always gets the angles."],
  ]),
  ...chats("legend", "arc", only("legend"), true, [
    ["Were you at the keeper's last night?", "Was I? Listen. I've no voice left.", "From the chanting?", "Mostly."],
    ["They've a drum at the keeper's now.", "What for?", "For the chant. Then for the other thing. Keeps time."],
    [["There {she} is! Three cheers for the keeper!", "Hip hip—", "{She} bowed! Did you see {her} bow?"], { loud: true }],
  ]),
  ...chats("rotten", "arc", and(late, shady), true, [
    ["The keeper'd sell {hers} own bed and charge for the sheets.", "And the pillows?", "Pillows are extra."],
  ]),
  // About her, by what shows and what's said.
  ...chats("respectHi", "respect", (f) => f.respect >= 4, true, [
    ["Fair keeper, that one. Honest measures.", "Wren's heart, they say.", "Wren's heart, and better ale."],
    ["The keeper sent my lad home sober and fed.", "Charged you?", "Not a copper. I went back and paid anyway."],
  ]),
  ...chats("respectLo", "respect", (f) => f.respect <= -3, true, [
    ["How much do you reckon the keeper charges?", "For ale?", "Not for ale."],
    [["Oi, keeper! Turn round, my friend's never seen it!", "I have, though.", "He has, though."], { loud: true }],
  ]),
  ...chats("fame", "fame", (f) => f.fame >= 30, true, [
    ["That's the keeper from the feed!", "The stew one?", "The everything one."],
    ["Zane posted the keeper again.", "How many hearts?", "More than the King's birthday."],
    [["It's {her}! Get your phone out!", "It's got no charge!", "Use mine! Mine's cracked but it works!"], { loud: true }],
  ]),
  ...chats("mess", "mess", (f) => f.messy || f.stained || f.smellsOfSex, true, [
    ["Is that... on the keeper's face?", "Don't stare.", "I'm not staring. I'm counting."],
    ["Can you smell that?", "Is it the tannery?", "It's the keeper.", "...Oh, good night, then."],
    [["Keeper! You've got a bit... all over, actually!", "Leave it, it suits {her}."], { loud: true }],
    [["Sniff that? Four men and a goblin, I reckon.", "A goblin?", "Smells of brass and haggling."], { r: ["beastfolk"] }],
  ]),
  ...chats("dress", "dress", (f) => f.dress !== "dressed" && f.dress !== "missingPiece", true, [
    ["Is the keeper wearing... anything?", "Less than yesterday.", "Yesterday was less than the day before."],
    ["Don't look. Don't look.", "I'm looking.", "Me too. Gods help us."],
    [["Cover up, keeper! It's cold!", "Don't tell {her} that!", "I'm being kind!", "You're being stupid."], { loud: true }],
    [["Postcards of the keeper, half price!", "Half price?", "Less fabric, less work."], { r: ["goblin"] }],
  ]),
  ...chats("outfit", "outfit", (f) => f.outfit === "revealing" || f.outfit === "lingerie", true, [
    ["Is the keeper in a nightie?", "A Lantern nightie.", "At the turnip stall?", "The turnips have never sold better."],
  ]),
  ...chats("drunk", "drunk", (f) => f.drunk >= 0.5, true, [
    ["Keeper's three sheets to the wind.", "Four.", "It's not even noon.", "It's noon somewhere. In the Deephold."],
  ]),
  ...chats("lust", "lust", (f) => f.desire >= 80 || f.lust >= 7, true, [
    ["Did you see how the keeper looked at that cucumber?", "Bought three.", "Three!"],
  ]),
  ...chats("title", "title", (f) => f.titles.some((t) => PUBLIC_TITLES.has(t) && t !== "innkeeper"), true, [
    ["They've a name for the keeper now.", "What name?", "Depends who you ask. And how drunk they are."],
  ]),
  ...chats("titleLewd", "title", (f) => wearing("unashamed")(f) || wearing("everyonesDarling")(f), true, [
    [["Morning, Darling! Morning, Unashamed!", "You can't call {her} both.", "{She} answers to both!"], { loud: true }],
  ]),
  ...chats("titleHard", "title", (f) => wearing("ironHand")(f) || wearing("brawlQueen")(f) || wearing("untouchable")(f), true, [
    ["Hobb tried it on with the keeper.", "And?", "Hobb's eating soup through a straw."],
  ]),
  ...chats("passiveLewd", "passive", has("openHouse", "wholeRoom", "wholeTable", "passedRound", "cockHungry", "exhibitionist"), true, [
    ["The keeper did the whole table, I heard.", "The whole table?", "The table's still recovering."],
    ["My brother says the keeper's very welcoming.", "Your brother's never been in.", "He says he has. Late."],
  ]),
  ...chats("passiveKeeper", "passive", has("spotlessName", "ladyOfTheHouse", "iceQueen", "untouchable"), true, [
    ["Nobody's laid a finger on the keeper, they say.", "Nobody?", "Pike tried. He's still looking for the finger."],
  ]),
  ...chats("debt", "debuff", debuffed("inDebt"), true, [
    ["Pell was at the keeper's door again.", "With his little book?", "And his littler friend. The soldier."],
  ]),
  ...chats("watched", "debuff", debuffed("watched"), true, [
    ["Garrison's watching the keeper's door.", "What for?", "Do they need a reason? It's the garrison."],
  ]),
  ...chats("bruised", "debuff", debuffed("bruised"), true, [
    ["Keeper's got a shiner.", "Brawl?", "Brawl. Won the brawl, lost the eye."],
  ]),
  ...chats("lantern", "lantern", (f) => f.lantern === "lit", true, [
    ["Red lamp's lit at Wren's place again.", "Like the old days?", "Grandad says better. Grandad says a lot of things."],
    ["The chapel's preaching against the keeper's lantern.", "Long sermon?", "Very detailed. Packed house."],
  ]),
  ...chats("oden", "plot", flag("odenShut"), true, [
    ["Somebody told Pell about the chapel.", "The keeper?", "I never said that.", "Nor did I. Walk on."],
  ]),
  ...chats("pell", "plot", flag("defiedPell"), true, [
    ["The keeper threw Pell out into the snow!", "In his good coat?", "In his good coat. Face first."],
  ]),
  ...chats("pellsEar", "plot", flag("pellsEar"), true, [
    ["Careful near the keeper. Pell's ear, that one.", "Says who?", "Says nobody. That's how I know."],
  ]),
  ...chats("trust", "trust", (f) => f.trust >= 10, true, [
    ["The keeper's one of us now.", "Bram says so?", "Bram's goat says so. Bram's catching up."],
  ]),
  ...chats("corrupt", "corruption", (f) => f.corruption >= 50, true, [
    ["Don't say anything near the keeper.", "Why?", "It'll be at the keep by noon, and sold twice on the way."],
  ]),
  ...chats("fans", "fans", (f) => f.fans >= 150, true, [
    ["Wren's place is the busiest on the street now.", "The Copper Bell's furious.", "The Copper Bell's empty."],
  ]),
  ...chats("late", "time", (f) => f.hour >= 16, true, [
    [["Shouldn't the keeper be opening?", "{She}'s still out here!", "Keeper! Five o'clock!"], { loud: true }],
  ]),
  // The town: what Tarven talks about when she isn't the subject.
  ...chats("town", "street", undefined, false, [
    ["Seen the feed? A lady at the Copper Bell looked EXACTLY like the Queen.", "In a wig?", "Terrible wig.", "Then it wasn't her."],
    ["My cousin texted me about the salt.", "You fool. Pell reads everything.", "It was a recipe!", "That's worse. Now he knows the recipe."],
    ["Never text what you can whisper.", "What if I can't whisper?", "Then move to the lowlands."],
    ["Kevin's still at the tavern on the Crown's tab.", "Still preparing?", "Three months of preparing.", "That's a lot of stew."],
    ["Zane filmed my cart losing a wheel.", "And?", "Ten thousand hearts. I'm famous. I'm also wheelless."],
    ["The Warm House is recruiting again.", "What are they offering?", "Warmth. And not much else to wear."],
    ["Oden says the Warm House is a disgrace.", "Did you go?", "Twice. To check."],
    ["A goblin sold me a phone charm shaped like the Baron.", "Does it work?", "It's a charm. It shouts 'pay your toll'."],
    ["Mana-stones are up again.", "My phone's on one bar.", "Mine's on a prayer and a lick."],
    ["The Baron's building something in the keep.", "What?", "Big. Shiny. Shaped like him, the masons say."],
    ["Old Hollis is coming up the pass, they say.", "The dwarf Hero? The accountant?", "Pell's been sick since he heard."],
    ["Did you hear? The orc Hero said 'please stop' and a whole warband sat down.", "Yumi?", "Sat down and apologised."],
    ["Thalanor was lifting carts in the square again.", "Brad?", "He wants to be called Brad. He's an elf called Brad."],
    ["The King's tipping strangers to flirt with his wife, I hear.", "That's a rumour.", "It's on the feed.", "Then it's a fact."],
    ["Quarry road's got no signal again.", "Good. Silas likes it that way."],
    ["Price of turnips is a crime.", "Price of everything's a crime.", "The Baron should be arrested.", "By who? He owns the arresters."],
    ["Who put the poster up on the chapel door?", "Which poster?", "The Warm House one. With the drawing.", "Oden's scrubbing it with his tears."],
    ["Bram's Fair's coming up.", "Dice, drink and dares.", "My favourite three words."],
    ["The bard and the goblin speaker are playing different songs again.", "At the same time?", "It's called music, apparently."],
  ]),
  ...chats("farmers", "kind", undefined, false, [
    [["Rain'll come by the fair.", "Your knee say so?", "My knee and the goat. The goat's never wrong."], { k: ["farmer"] }],
    [["Mara's holding a meeting at the mill.", "About what?", "Shh. Not out here."], { k: ["farmer"] }],
  ]),
  ...chats("soldiers", "kind", undefined, false, [
    [["Pike's put me on the gate again.", "What did you do?", "Nothing. That's the problem. He wanted me to do something."], { k: ["soldier"] }],
    [["Captain says hoodies off on duty.", "What about off duty?", "Off duty we're allowed to be comfortable. And sad."], { k: ["soldier"] }],
  ]),
  ...chats("crooks", "kind", undefined, false, [
    [["Load comes over the pass tonight.", "What load?", "Exactly."], { k: ["smuggler", "bandit"] }],
    [["Corran wants the toll wagon hit again.", "Again? Who's paying?", "Don't ask who's paying. Ask who's watching."], { k: ["bandit"] }],
  ]),
  ...chats("nobles", "kind", undefined, false, [
    [["One's phone hasn't had a bar since the gate.", "The Baron's relay is a disgrace.", "So is his hat."], { k: ["noble"] }],
  ]),
  ...chats("adventurers", "kind", undefined, false, [
    [["C rank's not bad.", "It's C.", "C is for... competent.", "It's for 'can't'."], { k: ["adventurer"] }],
  ]),
  ...chats("peoples", "race", undefined, false, [
    [["Your people court for a season?", "A season at least.", "Mine court for a pint.", "Barbaric. Tell me more."], { r: ["elf"] }],
    [["Goblin sold me a speaker.", "And?", "It works. I'm furious. I wanted something to complain about."], { r: ["human"] }],
    [["I'll drink you under the table.", "Under the floor, more like.", "The floor's stone. I'll drink through it."], { r: ["dwarf"] }],
    [["You. Me. Arm wrestle.", "Now?", "Orcs do not wait.", "...Fine."], { r: ["orc"] }],
    [["My tail's twitching.", "Rain?", "Gossip. Big gossip, coming this way."], { r: ["beastfolk"] }],
  ]),
];

/** What two townsfolk say when she comes close while they're talking about her, and won't say it to her face. */
export const HUSHES: readonly (readonly string[])[] = [
  ["...and then {she}— Shh! Here {she} comes.", "Morning, keeper! Lovely weather!"],
  ["Did you hear about the keeper's— ...", "Keeper! Hello! We were just talking about turnips."],
  ["So I said to Pell, the keeper's— Ahem.", "...Nice day."],
  ["Wait, wait. {She}'s right there.", "Who? Oh! Morning, keeper!"],
  ["...", "...Morning, keeper."],
  ["Don't look now.", "Is it {her}?", "I said don't look!"],
];

// ---------- Her standing, her name, and how the town treats her ----------

/**
 * Her standing in town (TOWN_DAY.md 6.1): what she is, which sets how formally people address her. Most aren't in
 * the game yet; any id is taken, and one with no lines of its own reads as the keeper.
 */
export type RoleId = "keeper" | "madam" | "squire" | "knight" | "knightCaptain" | "adventurer" | "priestess" | "council" | "reeve" | (string & {});
/** The standings the lines are written for: a squire, a knight and a knight-captain are all "knight". */
export type RoleGroup = "keeper" | "madam" | "knight" | "adventurer" | "priestess" | "council" | "reeve";

const ROLE_GROUP: Readonly<Record<string, RoleGroup>> = {
  keeper: "keeper",
  innkeeper: "keeper",
  madam: "madam",
  squire: "knight",
  knight: "knight",
  knightCaptain: "knight",
  adventurer: "adventurer",
  priestess: "priestess",
  priest: "priestess",
  council: "council",
  reeve: "reeve",
  mayor: "reeve",
};

/** Which written standing a role id is, the keeper for any not written yet. */
export function roleGroup(role: RoleId | undefined): RoleGroup {
  return (role && ROLE_GROUP[role]) || "keeper";
}

/** How she's addressed in each standing, as her or as him. */
const ROLE_ADDRESS: Readonly<Record<string, readonly [string, string]>> = {
  keeper: ["keeper", "keeper"],
  madam: ["Madam", "Master"],
  squire: ["Squire", "Squire"],
  knight: ["Dame", "Sir"],
  knightCaptain: ["Captain", "Captain"],
  adventurer: ["adventurer", "adventurer"],
  priestess: ["Priestess", "Priest"],
  council: ["Councillor", "Councillor"],
  reeve: ["Reeve", "Reeve"],
};

export function roleAddress(role: RoleId | undefined, body: HeroBody): string {
  const names = ROLE_ADDRESS[role ?? "keeper"] ?? ROLE_ADDRESS[roleGroup(role)];
  return names[body === "Female" ? 0 : 1];
}

/** The public names she can earn: the good ones, the plain ones, and the filthy ones. */
export type RepId =
  | "blushing"
  | "pride"
  | "ironHand"
  | "untouchable"
  | "brawler"
  | "barmaid"
  | "famous"
  | "drinker"
  | "secretSeller"
  | "baronsToy"
  | "darling"
  | "showOff"
  | "unashamed"
  | "warmHouseFav"
  | "bitchInHeat"
  | "townBike"
  | "freeUse"
  | "cumDump";

export type RepKind = "good" | "plain" | "lewd";

interface RepDef {
  id: RepId;
  /** What the town calls her, as her and as him. */
  names: readonly [string, string];
  kind: RepKind;
  /** How strongly she's known by it; 0 is not at all. */
  score: (f: TownFacts) => number;
}

const best = (...scores: number[]) => Math.max(0, ...scores);
const known = (f: TownFacts) => f.arc === "known" || f.arc === "legend";
const onArc = (f: TownFacts) => f.arc !== "sheltered";

/** Every public name, and what earns it (WORLD.md 9: titles that spread by gossip and the feed). */
export const REPUTATIONS: readonly RepDef[] = [
  { id: "blushing", names: ["the blushing keeper", "the blushing keeper"], kind: "good", score: (f) => (f.arc === "sheltered" && f.lewdness < 10 ? 2 : 0) },
  {
    id: "pride",
    names: ["Pride of Tarven", "Pride of Tarven"],
    kind: "good",
    score: (f) => best(wearing("prideOfTarven")(f) ? 9 : 0, f.trust >= 10 && f.respect >= 4 ? 6 : 0),
  },
  {
    id: "ironHand",
    names: ["the Iron Hand", "the Iron Hand"],
    kind: "good",
    score: (f) => best(wearing("ironHand")(f) ? 9 : 0, has("sharpPalm", "mistressOfTheBar", "rulesTheRoom")(f) ? 5 : 0),
  },
  {
    id: "untouchable",
    names: ["the Untouchable", "the Untouchable"],
    kind: "good",
    score: (f) => best(wearing("untouchable")(f) ? 9 : 0, has("iceQueen", "spotlessName", "untouchable")(f) ? 5 : 0),
  },
  {
    id: "brawler",
    names: ["Queen of the Brawl", "King of the Brawl"],
    kind: "good",
    score: (f) => best(wearing("brawlQueen")(f) ? 8 : 0, has("bouncer", "houseChampion")(f) ? 3 : 0),
  },
  { id: "barmaid", names: ["Barmaid of the Pass", "Barman of the Pass"], kind: "good", score: (f) => (wearing("barmaid")(f) ? 5 : 0) },
  { id: "famous", names: ["the keeper off the feed", "the keeper off the feed"], kind: "plain", score: (f) => (f.fame >= 50 ? 3 + f.fame / 20 : 0) },
  {
    id: "drinker",
    names: ["the one who drinks them under", "the one who drinks them under"],
    kind: "plain",
    score: (f) =>
      best(wearing("drinksThemUnder")(f) || wearing("lifeOfTheParty")(f) ? 6 : 0, has("bottomless", "lastStanding")(f) ? 4 : 0, f.drunk >= 0.6 ? 3 : 0),
  },
  {
    id: "secretSeller",
    names: ["the secret-seller", "the secret-seller"],
    kind: "plain",
    score: (f) => (has("looseLips", "secretBroker")(f) ? 4 + (f.corruption >= 50 ? 2 : 0) : 0),
  },
  {
    id: "baronsToy",
    names: ["the Baron's toy", "the Baron's pet"],
    kind: "plain",
    score: (f) => best(wearing("baronsCreature")(f) ? 9 : 0, f.corruption >= 60 ? 5 : 0, has("baronsPet", "baronsEar")(f) ? 4 : 0),
  },
  {
    id: "darling",
    names: ["Everyone's Darling", "Everyone's Darling"],
    kind: "lewd",
    score: (f) => best(wearing("everyonesDarling")(f) ? 9 : 0, wearing("tableFavourite")(f) ? 5 : 0, late(f) && has("passedRound")(f) ? 4 : 0),
  },
  {
    id: "showOff",
    names: ["the flasher of Tarven", "the flasher of Tarven"],
    kind: "lewd",
    score: (f) => best(topBare(f) || bottomBare(f) ? 8 : 0, onArc(f) && has("flasher", "exhibitionist", "showOff", "bareAndBold")(f) ? 5 : 0),
  },
  { id: "unashamed", names: ["Unashamed", "Unashamed"], kind: "lewd", score: (f) => (wearing("unashamed")(f) ? 9 : 0) },
  {
    id: "warmHouseFav",
    names: ["the Warm House's favourite", "the Warm House's favourite"],
    kind: "lewd",
    score: (f) => best(roleGroup(f.role) === "priestess" ? 8 : 0, f.outfit === "church" && late(f) ? 5 : 0),
  },
  {
    id: "bitchInHeat",
    names: ["the bitch in heat", "the stud in rut"],
    kind: "lewd",
    score: (f) =>
      onArc(f)
        ? best(f.desire >= 80 || f.lust >= 7 ? 6 + f.desire / 50 : 0, late(f) && has("alwaysWanting", "aching", "insatiable", "nightlyRitual", "restless")(f) ? 5 : 0)
        : 0,
  },
  {
    id: "townBike",
    names: ["the town bike", "the town stud"],
    kind: "lewd",
    score: (f) => best(known(f) ? 7 + f.lewdness / 80 : 0, f.arc === "willing" && f.lewdness >= 80 ? 4 : 0),
  },
  {
    id: "freeUse",
    names: ["the free-use keeper", "the free-use keeper"],
    kind: "lewd",
    score: (f) => (known(f) && has("openHouse", "wholeRoom", "wholeTable", "easyPrey")(f) ? 8 : 0),
  },
  {
    id: "cumDump",
    names: ["the cum-dump of the pass", "the cum-dump of the pass"],
    kind: "lewd",
    score: (f) => (known(f) && f.lewdness >= 120 && (f.messy || has("cockHungry", "insatiable", "fromBehind", "firstNight")(f)) ? 7 + (f.messy ? 3 : 0) : 0),
  },
];

/** A public name she's earned, and how strongly. */
export interface Reputation {
  id: RepId;
  name: string;
  kind: RepKind;
  score: number;
}

const repCache = new WeakMap<TownFacts, Reputation[]>();

/** The public names she's known by right now, best known first. */
export function reputationOf(f: TownFacts): Reputation[] {
  const cached = repCache.get(f);
  if (cached) return cached;
  const reps = REPUTATIONS.map((def) => ({ id: def.id, name: def.names[f.body === "Female" ? 0 : 1], kind: def.kind, score: def.score(f) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  repCache.set(f, reps);
  return reps;
}

/** The filthiest name she's best known by, or null if she has none. */
export function lewdName(f: TownFacts): Reputation | null {
  return reputationOf(f).find((r) => r.kind === "lewd") ?? null;
}

/** The name {rep} fills with: her filthiest if she has one, else her best known, else "keeper". */
function topName(f: TownFacts): string {
  return (lewdName(f) ?? reputationOf(f)[0])?.name ?? "keeper";
}

/** How the street treats her: politely, with leers, with offers, or as public property. */
export type Treatment = "polite" | "leering" | "propositions" | "property";
export const TREATMENTS: readonly Treatment[] = ["polite", "leering", "propositions", "property"];

export function treatmentOf(f: TownFacts): Treatment {
  const reps = new Set(reputationOf(f).map((r) => r.id));
  let tier = 0;
  if (known(f) && (reps.has("freeUse") || reps.has("cumDump") || reps.has("townBike")) && f.respect <= 2) tier = 3;
  else if (late(f) || reps.has("bitchInHeat") || reps.has("townBike")) tier = 2;
  else if (f.arc === "curious" || f.respect <= -3 || reps.has("showOff")) tier = 1;
  // A well-respected name takes the edge off, short of public property.
  if (f.respect >= 6 && tier < 3) tier = Math.max(0, tier - 1);
  return TREATMENTS[tier];
}

const roleIs = (...groups: RoleGroup[]): When => (f) => groups.includes(roleGroup(f.role));
const repHas = (...ids: RepId[]): When => (f) => reputationOf(f).some((r) => ids.includes(r.id));
const lewdRep: When = (f) => lewdName(f) !== null;
const cleanRep: When = (f) => lewdName(f) === null;
const goodRep: When = (f) => reputationOf(f).some((r) => r.kind === "good");
const treatAt = (...tiers: Treatment[]): When => (f) => tiers.includes(treatmentOf(f));
const respectable = roleIs("knight", "adventurer", "priestess", "council", "reeve");

// ---------- The adult script: names, standing, treatment, and more of her arc ----------

const ADULT_PASSING: readonly TownLine[] = [
  // ---- Her filthy names, to her face ----
  ...group("rep.townBike", "rep", repHas("townBike"), "lust", [
    "Everyone's had a go on the town bike, they say. I'm next on the list.",
    "Saw your name on the privy wall, keeper. Three times. In three hands.",
    "Morning, {rep}! Who's riding today?",
    ["There's the town bike. Lovely frame. Bit worn in the saddle.", { b: F, act: "whistle" }],
    ["My cousin rode the town bike last week. Says the bell still works.", { b: F }],
    ["Town bike! Free on Sundays, they say. Is it Sunday?", { b: F, act: "proposition" }],
    ["There's the town stud. Half the wives in Tarven have been to stud.", { b: M, act: "whistle" }],
    ["The town stud! My wife says hello. She says it fondly. Too fondly.", { b: M, sex: "m" }],
    ["The town stud! Is it true you're booked till harvest? I'll wait.", { b: M, sex: "f", act: "proposition" }],
    ["You. Town bike. I am orc. I ride gently. Yes or no?", { b: F, r: ["orc"], act: "proposition", ask: true }],
  ]),
  ...group("rep.bitchInHeat", "rep", repHas("bitchInHeat"), "lust", [
    "You can smell it on you, keeper. The whole street's panting.",
    "Steady, keeper, you just looked at a fence post like it owed you a fuck.",
    "Need a hand, keeper? You're squirming like there's ants in your smalls.",
    ["There's the bitch in heat! Somebody throw a bucket on her!", { b: F }],
    ["Bitch in heat, they call you. You rubbed on the well rope this morning.", { b: F }],
    ["Down, girl! ...Sorry, keeper. The lads dared me.", { b: F, k: ["soldier", "adventurer"] }],
    ["Here comes the stud in rut! Lock up your wives!", { b: M }],
    ["Stud in rut, they call you. You humped the hitching post this morning.", { b: M }],
    ["Down, boy! ...Sorry, keeper. The lads dared me.", { b: M, k: ["soldier", "adventurer"] }],
    ["Heat season, keeper? The wolf-kin say you smell like their spring.", { r: ["beastfolk"] }],
  ]),
  ...group("rep.freeUse", "rep", repHas("freeUse"), "lust", [
    "The free-use keeper! Is it true? Or is it a rumour I want to be true?",
    "If it's free, why's there a queue? ...Oh. Because it's free.",
    ["Free use, they say. Do you take tips anyway? I'd tip.", { act: "offer-coin" }],
    ["Free-use keeper, they say. May I? I'm asking. Asking's free too.", { act: "proposition", ask: true }],
    ["Morning, free-use! Mind if I squeeze that arse on my way past?", { act: "proposition", ask: true }],
    ["Morning, free-use! *slap* Lovely and firm, that.", { act: "grope", lands: true }],
    ["*squeezes* Free-use keeper, free-use tits. Ta, keeper!", { b: F, act: "grope", lands: true }],
    ["*squeezes* Free-use keeper, free-use arse. Ta, keeper!", { b: M, act: "grope", lands: true }],
  ]),
  ...group("rep.cumDump", "rep", repHas("cumDump"), "lust", [
    "Morning, cum-dump of the pass! Busy night?",
    "They say you take every load on the pass. Even the toll's.",
    "Half the garrison's balls are empty and you're glowing. Coincidence?",
    "Bread's fresh, keeper. Cream's fresher, I hear. All over you.",
    ["You've still got some on your chin, cum-dump. Wear it proud.", { w: (f) => f.messy }],
    ["Cum-dump of the pass! I've been saving mine since Tuesday.", { sex: "m", act: "proposition" }],
    ["Buckets with your face on, keeper! Two silver! Very popular!", { r: ["goblin"], m: "scheming" }],
  ]),
  ...group("rep.warmHouseFav", "rep", repHas("warmHouseFav"), "happy", [
    "The Warm House's favourite! Veyra smiles on you, keeper. Widely.",
    "The devotees light a candle for you. A red one. A big one.",
    "Is it true the Warm House named a pew after you? A padded pew?",
    "Oden says you're Veyra's own temptation. He says it a lot. Very detailed.",
    ["Veyra's favourite! Bless me, keeper. Use your hands.", { sex: "m", act: "proposition" }],
  ]),
  ...group("rep.baronsToy", "rep", repHas("baronsToy"), "scheming", [
    "Pell says you're very obliging. Pell says it with a smile. Horrible.",
    "Does the Baron wind you up, keeper, or do you run on silver?",
    "He only wants the book, they say. Everyone else wants the rest of you.",
    ["The Baron's toy! Off up the hill for your orders?", { b: F, act: "spit" }],
    ["The Baron's pet! Off up the hill for a pat on the head?", { b: M, act: "spit" }],
  ]),
  ...group("rep.showOff", "rep", repHas("showOff"), "lust", [
    ["The flasher of Tarven! Go on. Just a peek. For the fair.", { act: "whistle" }],
    "Keep your clothes on today, keeper? I've a bet riding on it.",
    ["Lifted your skirt at the well yesterday, they say. The well's still blushing.", { b: F }],
    ["Dropped your breeches at the well yesterday, they say. The bucket fainted.", { b: M }],
  ]),
  ...group("rep.darling", "rep", repHas("darling"), "happy", [
    "Darling! Your lap's spoken for till midsummer, I hear. Put me down for autumn.",
    ["Everyone's Darling! Room for one more on the list? I'm very small. Ish.", { act: "proposition" }],
  ]),
  // ---- Her good names ----
  ...group("rep.good.pride", "rep", repHas("pride"), "happy", [
    ["Pride of Tarven! My mother wants your portrait over the hearth.", { act: "bow" }],
    "Pride of Tarven! The Copper Bell's keeper spat in his ale when they cheered you.",
  ], "rep.good"),
  ...group("rep.good.ironHand", "rep", repHas("ironHand"), "scared", [
    "The Iron Hand's out, lads! Hands in pockets!",
    "Iron Hand! Slap me, I've been bad. ...No, really, it's for a bet.",
  ], "rep.good"),
  ...group("rep.good.untouchable", "rep", repHas("untouchable"), "calm", [
    "Untouchable, still? Thirty men tried at the fair. I watched. Magnificent.",
  ], "rep.good"),
  ...group("rep.good.brawler", "rep", repHas("brawler"), "scared", [
    ["Queen of the Brawl! Fight me! ...Not today. Tomorrow. Maybe.", { b: F }],
    ["King of the Brawl! Fight me! ...Not today. Tomorrow. Maybe.", { b: M }],
  ], "rep.good"),
  ...group("rep.plain", "rep", undefined, "happy", [
    ["The keeper off the feed! Do the face! The pout! Do the pout!", { w: repHas("famous"), act: "photo", m: "idolize" }],
    ["There's the one who drinks them under! The dwarves have sent a champion.", { w: repHas("drinker") }],
    ["Secret-seller! I've one for you. My neighbour's goat is a spy.", { w: repHas("secretSeller"), m: "scheming" }],
    ["The blushing keeper! Go on, blush for us. ...There it is!", { w: repHas("blushing"), act: "whistle" }],
    ["Barmaid of the Pass! Nine cups on one tray. I've seen it.", { w: repHas("barmaid"), b: F }],
    ["Barman of the Pass! Nine cups on one tray. I've seen it.", { w: repHas("barmaid"), b: M }],
  ]),
  ...group("rep.unashamed", "rep", repHas("unashamed"), "lust", [
    "Unashamed! They named you that and you wear it like a hat.",
    ["Unashamed! Prove it! ...Gods, she did. Somebody fetch Oden.", { b: F, act: "whistle" }],
    ["Unashamed! Prove it! ...Gods, he did. Somebody fetch Oden.", { b: M, act: "whistle" }],
  ]),

  // ---- How the street treats her ----
  ...group("treat.leer", "treat", treatAt("leering", "propositions"), "lust", [
    ["Phwoar! Morning, keeper!", { act: "whistle" }],
    ["Look at the walk on that. Slower, keeper, slower!", { act: "whistle" }],
    "A coin to whoever guesses what's under your apron, keeper!",
    "Hello, keeper! Lovely... day. Lovely day. Lovely everything.",
    ["*whistles* Is it warm, keeper, or is it just you?", { act: "whistle" }],
    ["Nice tits, keeper! ...Morning, I mean. Nice morning.", { b: F, act: "whistle" }],
    ["Nice arse, keeper! ...Morning, I mean. Nice morning.", { b: M, act: "whistle" }],
  ]),
  ...group("treat.offer", "treat", treatAt("propositions", "property"), "lust", [
    ["Five silver for the afternoon, keeper. Six if you bring the apron.", { act: "offer-coin" }],
    ["Back of the bakehouse, keeper. Five minutes. I'm quick, I promise.", { act: "proposition" }],
    ["Got a room at the Copper Bell. Their beds squeak. I like a squeak.", { act: "proposition" }],
    ["My lap's free and my purse is full, keeper. Interested?", { act: "offer-coin" }],
    ["Ride me to the gate and back, keeper? Not the horse. Me.", { act: "proposition" }],
    ["Suck me off behind the well and I'll buy your whole cask of mead.", { sex: "m", act: "offer-coin" }],
    ["Me and the wife want you for the night. She's very persuasive.", { sex: "m", act: "proposition" }],
    ["Me and my husband want you for the night. He does what I say.", { sex: "f", act: "proposition" }],
    ["One requires your company. Discreetly. For an hour. Or six.", { k: ["noble"], act: "offer-coin" }],
    ["Trade you a cask of mead for a night. Two casks for the whole night.", { k: ["farmer"], act: "offer-coin" }],
  ]),
  ...group("treat.property", "treat", treatAt("property"), "lust", [
    // Consent On: they ask, and her no stands.
    ["Keeper! Fancy a quick grope by the trough? I'm asking nicely.", { act: "proposition", ask: true }],
    ["Can I have a feel, keeper? Just a squeeze. I'll pay the toll.", { act: "proposition", ask: true }],
    ["Mind if I warm my hands on your tits? It's cold, and they're right there.", { b: F, act: "proposition", ask: true }],
    ["Mind if I give your arse a slap for luck? It's market day.", { act: "proposition", ask: true }],
    ["Bend over for me, keeper? I'll ask twice, I'm polite.", { act: "proposition", ask: true }],
    ["Can I touch, keeper? Everyone else has.", { act: "proposition", ask: true }],
    // Consent Off: hands land.
    ["*slaps your arse* Morning, keeper! Lovely and firm!", { act: "grope", lands: true }],
    ["*grabs a handful* Market's fresh today, eh keeper?", { act: "grope", lands: true }],
    ["*pinches your bum* Everyone does it, keeper. It's tradition now.", { act: "grope", lands: true }],
    ["*squeezes your tit* Just checking they're real. They're real!", { b: F, act: "grope", lands: true }],
    ["*hand up your skirt* Morning! Don't mind me, I'm just passing.", { b: F, act: "grope", lands: true }],
    ["*cups your crotch* Just checking you're real. You're real!", { b: M, act: "grope", lands: true }],
    ["*hand down your breeches* Morning! Don't mind me, just passing.", { b: M, act: "grope", lands: true }],
  ]),
  ...group("treat.pity", "treat", (f) => f.respect <= -3 && lewdRep(f), "gloomy", [
    ["Oh, love. Want a cup of tea and a sit-down? No hands, I promise.", { sex: "f", act: "nod" }],
    "Your nan would weep, keeper. Then she'd charge them double.",
    ["You poor thing. Here, have a bun. No, a real bun.", { sex: "f" }],
  ]),
  ...group("treat.jealous", "treat", (f) => (late(f) && lewdRep(f)) || f.fame >= 50, "angry", [
    ["My husband says your name in his sleep. Mine, never.", { sex: "f" }],
    ["What've you got that I haven't? ...Don't answer. I can see.", { sex: "f" }],
    ["Stay away from my Tom, keeper. ...Unless he pays. Then I want half.", { sex: "f", act: "spit" }],
    ["Even the blacksmith wants you. He only ever wanted his anvil.", { sex: "f" }],
  ]),
  ...group("treat.worship", "treat", (f) => (f.fame >= 50 && lewdRep(f)) || (known(f) && f.lantern === "lit"), "idolize", [
    ["Goddess! May I kiss your boots? Just the boots. To start.", { act: "bow" }],
    "I've built a little shrine to you. It's a bit sticky. Sorry.",
    ["My whole village worships you, keeper. We've a song. It's mostly moaning.", { act: "bow" }],
  ]),
  ...group("treat.hire", "treat", late, "scheming", [
    ["The painter wants you nude for the chapel ceiling. Two silver an hour.", { act: "offer-coin" }],
    ["My lord wants a bath attendant tonight, keeper. Well paid. Very wet.", { act: "offer-coin" }],
    ["Pose for my phone, keeper? Tasteful. ...Mostly tasteful. Four silver.", { act: "photo" }],
    ["Wedding on Saturday. The groom wants you for the stag night. Name a price.", { act: "offer-coin" }],
    ["Model for my figurines, keeper? They sell better with you on them.", { r: ["goblin"], act: "offer-coin" }],
  ]),
  ...group("treat.bet", "treat", (f) => lewdRep(f) || repHas("brawler", "drinker")(f), "happy", [
    "The barracks are betting on how long you stay dressed today. I said noon.",
    "Bet's on: you, the dwarf champion, and a cask. Whoever's left standing.",
    "I've five silver on you not blushing by the well. Don't let me down.",
    "The odds on you and Kevin are terrible. He keeps falling asleep.",
  ]),
  ...group("treat.spit", "treat", (f) => late(f) && lewdRep(f), "angry", [
    ["Harlot. ...Is it true about the table, though? Asking for the chapel.", { sex: "f", act: "spit" }],
    ["*spits* Disgrace. ...Mind, my husband's never been happier.", { sex: "f", act: "spit" }],
    ["Pfft. Shameless. ...Which night is cheapest?", { k: ["noble"], act: "spit" }],
  ]),
  ...group("treat.scandal", "treat", (f) => late(f) || lewdRep(f), "scheming", [
    ["Scandalous! Utterly! ...Is Thursday free?", { k: ["noble"] }],
    ["One is appalled. One's secretary will be in touch about a booking.", { k: ["noble"] }],
    ["The Baroness has heard of you, keeper. She's appalled. She's coming Friday.", { k: ["noble"] }],
  ]),

  // ---- Her standing (respected roles) ----
  ...group("role.reeve", "role", and(roleIs("reeve"), cleanRep), "happy", [
    ["Good morning, Reeve! Fine work on the toll, fine work.", { act: "bow" }],
    "Reeve! The well's broken again. And the council. Mostly the well.",
    ["Long live the Reeve! ...Did I do that right? First time.", { act: "bow" }],
  ]),
  ...group("role.council", "role", and(roleIs("council"), cleanRep), "calm", [
    "Councillor! Your papers, signed, sealed, and smelling of Pell.",
    "Councillor. The farmers want a word. The goats want two.",
  ]),
  ...group("role.knight", "role", and(roleIs("knight"), cleanRep), "happy", [
    ["*salutes* Morning, {Role}!", { act: "bow", k: ["soldier"] }],
    "The garrison's honoured you ride with us, {Role}. Even Pike polished his boots.",
    "{Role}! Your horse ate my hat. Respect, though. Good horse.",
  ]),
  ...group("role.adventurer", "role", and(roleIs("adventurer"), cleanRep), "happy", [
    "Off north, adventurer? Bring me a slime. A little one.",
    "Guild says you're climbing the ranks fast. D rank by the fair, they say.",
  ]),
  ...group("role.priestess", "role", and(roleIs("priestess"), cleanRep), "happy", [
    ["Blessings, {Role}! Veyra's warmth on you.", { act: "bow" }],
    "{Role}! When's the next open service? Asking for my soul.",
  ]),
  ...group("role.madam", "role", roleIs("madam"), "lust", [
    "{Role} of the Lantern! How's the house? How are the rates?",
    "{Role}! Any room at the Lantern tonight? I've been saving.",
    "Morning, {Role}. Your red lamp kept me up all night. Not the light. The noise.",
    ["The Lantern's {Role}, and still a good name. Wren would've liked you.", { w: goodRep }],
  ]),
  // ---- Her standing, and the name she's earned with it: the heart of the joke ----
  ...group("role.lewd.reeve", "role", and(roleIs("reeve"), lewdRep), "lust", [
    ["Morning, Reeve. Lovely speech yesterday. Lovely arse too, the whole square saw it.", { act: "bow" }],
    "Reeve! The new law. Is it true you tested it yourself? Personally?",
    "Town hall's open, Reeve. Your desk's been cleaned. Again. Who keeps doing that?",
    "Our Reeve! First to pass a law and first to lie under it.",
    "Reeve! The council asks: is {rep} your official title now?",
    ["All rise for the Reeve! ...Some of us already have, Reeve.", { sex: "m" }],
    ["Reeve, the council voted. You're to judge the wet-shirt contest. And enter.", { b: F }],
    ["Reeve, the council voted. You're to judge the trouser race. And run it.", { b: M }],
  ], "role.lewd"),
  ...group("role.lewd.council", "role", and(roleIs("council"), lewdRep), "lust", [
    ["Your papers, Councillor. And my cock. Wrong hand. Both need your seal.", { sex: "m", act: "proposition" }],
    "Councillor! The minutes say you moved a motion. On the clerk. Twice.",
    "Councillor, the vote was tied. They say you broke it with your mouth.",
    "Councillor, the clerk's sent your documents. And his drawers. Both signed.",
  ], "role.lewd"),
  ...group("role.lewd.knight", "role", and(roleIs("knight"), lewdRep), "lust", [
    ["*salutes* {Role}! ...Permission to have a turn after drill, {Role}?", { k: ["soldier"], act: "bow" }],
    ["*salutes* The lads drew lots, {Role}. I'm first. If you say yes.", { k: ["soldier"], act: "proposition", ask: true }],
    "A knight of the realm and the realm's favourite ride. Busy, {Role}?",
    "Knighted on Monday, bedded by the garrison by Tuesday. A legend, {Role}.",
    "{Role}! Your armour's on backwards again. Long night in the barracks?",
  ], "role.lewd"),
  ...group("role.lewd.adventurer", "role", and(roleIs("adventurer"), lewdRep), "lust", [
    "Adventurer! C rank on paper, S rank in the bedroll, they say.",
    ["Party's short a cleric, adventurer. And a bedwarmer. Interested in both?", { k: ["adventurer"], act: "proposition" }],
    "Heard you paid the guild fee in kind. The whole guild hall heard.",
  ], "role.lewd"),
  ...group("role.lewd.priestess", "role", and(roleIs("priestess"), lewdRep), "lust", [
    ["Bless me, {Role}! With your hands, ideally.", { act: "proposition" }],
    "Veyra's own {Role}! I've sinned. I'd like to sin more. Can you help?",
    "The Warm House's best, they say. Is confession on your knees?",
  ], "role.lewd"),

  ...group("role.lewd.any", "role", and(respectable, lewdRep), "lust", [
    "Morning, {Role}! Or is it {rep} today?",
    ["Hats off for the {Role}! ...And trousers off for {rep}.", { sex: "m", act: "bow" }],
    "A {Role} by day and {rep} by night. Tarven's proud. Mostly.",
  ], "role.lewd"),

  // ---- More of her arc, at the lewd stages ----
  ...group("arc2.curious", "arc", stage("curious"), "happy", [
    "Heard you let a soldier's hand stay on your knee. A whole song long.",
    "You've a love bite, keeper. ...Right there. No, the other side.",
    "Is it true you sat on a lap at the fair? Whose lap? I'm jealous.",
    "First kiss behind the bar, first grope by the cask. Coming along, keeper.",
    "You blushed and didn't slap him. The whole room noticed. Progress!",
    "Curious, are we? I'm curious too. We could be curious together.",
    ["Your blouse is undone a button lower than last week. I'm keeping count.", { b: F }],
    ["Your shirt's undone a button lower than last week. I'm keeping count.", { b: M }],
  ], "arc.curious"),
  ...group("arc2.willing", "arc", stage("willing"), "lust", [
    ["Keeper! Heard you're taking bookings. Pencil me in. In ink.", { act: "proposition" }],
    ["My bed's been empty since spring, keeper. I'll pay for the company.", { act: "offer-coin" }],
    "Saw you go upstairs with two at once. Two! On a Tuesday!",
    "Is the after-hours game on tonight? I've been practising. On my own.",
    "You were on your knees behind the bar, they say. Looking for a cork?",
    "Wren took coin for it, they say. Like grandmother, like {grandchild}.",
    "Sabine at the Velvet House says you're stealing her regulars. With your mouth.",
    ["Heard your tits got passed round the table like the bread basket.", { b: F }],
    ["Heard your cock got passed round the table like the bread basket.", { b: M }],
  ], "arc.willing"),
  ...group("arc2.known", "arc", stage("known"), "lust", [
    "Keeper! Took three at once, they say. Three! I can barely take my boots off.",
    "They say your mouth's had more cocks in it than the toll collector's had coins.",
    "Morning, keeper! Last night's queue went round the well. Twice.",
    "Is it true you came so loud the chapel bell rang back?",
    "Don't bother with the toll, they say. Pay the keeper in cum.",
    "You've ridden more men than the post horse, keeper. And kept up better.",
    "The farmers' wives sent a petition. Half to ban you. Half for lessons.",
    "Seen you naked so often, keeper, I didn't know you owned clothes.",
    ["Your cunt's famous from here to the Deephold. The dwarves sing about it.", { b: F }],
    ["Your cock's famous from here to the Deephold. The dwarves sing about it.", { b: M }],
    ["Every soldier in the garrison has a story about you, keeper. Same story.", { k: ["soldier"] }],
    ["Had you twice and I still don't know your name. Is that bad?", { sex: "m" }],
  ], "arc.known"),
  ...group("arc2.rotten", "arc", and(late, shady), "scheming", [
    "Keeper! What's a name cost these days? And a blowjob? Same price?",
    "Sold my secret and sucked my cock in one night. Efficient, keeper.",
    "They say you fuck for silver and listen for gold.",
    "Rotten to the core and sweet in the middle, they say. Which bit's for sale?",
    "Pell says you're the best thing he's ever bought. Pell's never bought anything.",
    ["Charge me double, keeper. I like the danger.", { act: "offer-coin" }],
  ], "arc.rotten"),
];

/** What townsfolk call out to her as she walks by: the town's talk and the adult script together. */
export const PASSING: readonly TownLine[] = [...BASE_PASSING, ...ADULT_PASSING];
const LINE_BY_ID: ReadonlyMap<string, TownLine> = new Map(PASSING.map((line) => [line.id, line]));

const ADULT_REPLIES: Readonly<Record<string, ReplyPool>> = {
  rep: {
    early: ["(Is that what they call me? Is that what they CALL me?)", "That's not— who started that?"],
    late: ["Say it louder. It sells ale.", "(They're not wrong.)", "And proud of it."],
  },
  "rep.good": { any: ["Earned it.", "(Grandma, they're saying it nicely.)", "You're too kind. Keep going."] },
  "rep.plain": { any: ["That's me.", "(Everyone knows everything in Tarven.)", "Morning."] },
  "rep.townBike": {
    early: ["(The town what? Who's been riding— oh. Oh no.)", "That's a horrible name!"],
    late: ["Ring the bell twice.", "(Well. Everyone has had a ride.)", "Bring your own saddle."],
  },
  "rep.bitchInHeat": {
    early: ["(Is it that obvious? It's that obvious.)", "I'm— it's the weather! It's hot!"],
    late: ["Then come and put me out of my misery.", "(Gods, I'd climb that fence post if it asked.)", "Tonight. I'll be howling."],
  },
  "rep.freeUse": {
    early: ["That is NOT what it means!", "(I'm going to be sick. Or wet. One of those.)"],
    late: ["Free to look. Touch, and you'll find out.", "Use, yes. Abuse, no. Wipe your boots.", "(Grandma charged. I'm... generous.)"],
  },
  "rep.cumDump": {
    early: ["(I want to die. I want to die in a hole.)", "D-don't call me that!"],
    late: ["Only the best loads, love.", "(They're keeping count. Of course they are.)", "Bring it tonight. I'll take it."],
  },
  "rep.warmHouseFav": { any: ["Veyra provides.", "(Warm House, warm bed, warm everything.)", "Come to service. Bring an offering."] },
  "rep.baronsToy": { any: ["The Baron pays better than you.", "(Let them talk. Pell does the dirty work. I do the clean.)", "Careful what you say near me, then."] },
  role: { any: ["Morning to you too.", "(Grandma, look. They bow now.)", "Carry on."] },
  "role.lewd": {
    early: ["(They saw. They ALL saw.)", "That was a private... no, it wasn't private."],
    late: ["Office hours are at the tavern, after dark.", "(Respect and a reputation. Why not both?)", "I serve the town. All of it."],
  },
  "treat.leer": {
    early: ["(Don't look at them. Don't look.)", "Eyes up!"],
    late: ["Look all you like. It's free till five.", "(Whistle louder. It's flattering.)"],
  },
  "treat.offer": {
    sheltered: ["I— no! Absolutely not!", "(Did he— in the STREET?)"],
    curious: ["(Five silver. For— no. No!)", "I'm not— that's not— no!"],
    willing: ["Make it ten and come tonight.", "(Tempting. Very tempting.)"],
    known: ["Tonight. Bring two of you.", "The bakehouse is for amateurs. My room."],
  },
  "treat.property": {
    sheltered: ["(A hand! In the street! On my—)", "Hey! HEY!"],
    curious: ["(Why didn't I slap him? Why am I smiling?)", "Hands! ...Oh."],
    willing: ["Harder, love. I can barely feel it.", "That's a copper, that is."],
    known: ["Morning to you too.", "(Another one. Lovely. Keep walking.)"],
  },
  "treat.pity": { any: ["I'm fine. Really. Better than fine.", "(Tea. Gods, I could do with tea.)"] },
  "treat.jealous": {
    early: ["I didn't— I'd never!", "(I didn't even look at him!)"],
    late: ["Keep your husband home, then.", "(He came to me. They all come to me.)"],
  },
  "treat.worship": { any: ["Rise, rise. Doors are at five.", "(A shrine. A sticky shrine. Grandma, are you seeing this?)"] },
  "treat.hire": {
    early: ["N-nude? For a ceiling?", "(Two silver an hour. ...No!)"],
    late: ["Four silver and I keep the painting.", "Send the details. And an advance."],
  },
  "treat.bet": { any: ["Put me down for a silver on me.", "(I'll make sure they lose. Or win. Depends who's paying.)"] },
  "treat.spit": { any: ["Lovely to see you too.", "(Thursday. They'll be in on Thursday.)"] },
  "treat.scandal": { any: ["Thursday's free.", "(Appalled and booking. The nobles are all the same.)"] },
  // Answers to a touch asked for (Consent On asks; her no stands).
  "ask.yes": {
    curious: ["...Quickly, then. Before I change my mind."],
    willing: ["Go on, then. Quickly.", "One squeeze. That's a copper."],
    known: ["Go on. Everyone else has.", "Both hands, love. Don't be shy."],
  },
  "ask.no": {
    sheltered: ["No! Absolutely not!", "(He ASKED. In the street. No.)"],
    curious: ["No. ...Not here.", "Hands to yourself. Thank you for asking."],
    willing: ["Not today, love.", "Ask me tonight. Not out here."],
    known: ["Not today. Even I have days off.", "No. You asked nicely, though."],
  },
};

/** What she says to a touch asked for when she's too drunk to say yes (Consent On: too drunk is always a no). */
const TOO_DRUNK_NO: readonly string[] = ["(Too drunk to say yes to anything. No.)", "No. Ask me sober."];
/** As drunk as she can be and still say yes (tavern.ts SLOPPY_DRUNK). */
export const TOO_DRUNK_TO_YES = 0.95;

/** Her answers, by reply key: the town's talk and the adult script together. */
export const REPLIES: Readonly<Record<string, ReplyPool>> = { ...BASE_REPLIES, ...ADULT_REPLIES };

/** Her yes or no to a touch asked for. Sheltered, never; the further along, the likelier; too drunk, never. */
function answerAsk(f: TownFacts, random: () => number): HerReply {
  const s = stageIndex(f.arc);
  const tooDrunk = !f.consentOff && f.drunk >= TOO_DRUNK_TO_YES;
  const yes = !tooDrunk && (s === 3 ? random() < 0.85 : s === 2 ? random() < 0.6 : s === 1 ? f.desire >= 60 && random() < 0.35 : false);
  const pool = tooDrunk ? TOO_DRUNK_NO : (replyPool(yes ? "ask.yes" : "ask.no", f.arc) ?? TOO_DRUNK_NO);
  const text = fillFor(pool[Math.floor(random() * pool.length) % pool.length], f);
  return { text, thought: text.startsWith("("), answer: yes ? "yes" : "no" };
}

const ADULT_EXCHANGES: readonly TownExchange[] = [
  ex("reeve", "role", roleIs("reeve"), "happy", "Reeve! The new law. Did you write it, or did you test it?", [
    "I wrote it! Only wrote it!",
    "I wrote it. Mostly.",
    "Both. Thoroughly.",
    "Both. Ask the council how thoroughly.",
  ], "Long live the Reeve!"),
  ex("clerk", "role", roleIs("council"), "calm", "Councillor, your documents. And... a personal request.", [
    "What sort of request?",
    "...How personal?",
    "Sign here, and here, and where?",
    "Leave it on my desk. Both things.",
  ], ["It's a petition! About the well!", "Very. It's about the well.", "Under the desk, Councillor.", "Yes, Councillor."], { sex: "m" }),
  ex("knight", "role", roleIs("knight"), "calm", "*salutes* {Role}! Permission to speak freely?", [
    "Granted.",
    "Granted. Carefully.",
    "Granted. And to do more, after drill.",
    "Speak, soldier. Then kneel.",
  ], ["The lads think you're lovely.", "The lads would die for you.", "Yes, {Role}!", "Yes, {Role}! Gladly, {Role}!"], { k: ["soldier"] }),
  ex("madam", "role", roleIs("madam"), "lust", "{Role}! What's the house special tonight?", [
    "It's... a stew.",
    "The stew. And the girls are very nice.",
    "Two girls and a bath.",
    "Me. If you can afford me.",
  ], ["Stew, then.", "I'll take nice.", "I'll bring my purse.", "I've been saving all year."]),
  ex("priestess", "role", roleIs("priestess"), "lust", "{Role}, will you hear my confession?", [
    "Of course. What troubles you?",
    "Yes. Are you... sure?",
    "On your knees, then. Mine after.",
    "In the back. Veyra likes it hands-on.",
  ], "Bless you. Bless you very much."),
  ex("bike", "rep", repHas("townBike"), "lust", "Is it true what they call you, keeper?", [
    "",
    "What do they call me?",
    "The town bike? Ding ding.",
    "Saddle's free. Bring your own bell.",
  ], ["", "...Nothing! Nothing.", "Ha! Can I ride?", "Ha! When's my turn?"]),
  ex("rut", "rep", repHas("bitchInHeat"), "lust", "You all right, keeper? You're pacing like a cat in a cupboard.", [
    "",
    "I'm fine! It's warm. Isn't it warm?",
    "No. I need— nothing. Something.",
    "No. I need fucking. Are you volunteering?",
  ], ["", "It's snowing.", "Something's what I've got.", "Gods. Yes. Lead the way."]),
  ex("freeUse", "rep", repHas("freeUse"), "lust", "Free use, they say. So... may I? I'm asking.", [
    "",
    "",
    "Ask nicely and you might.",
    "You just did. Go on.",
  ], ["", "", "Pretty please?", "Gods bless Tarven."]),
  ex("cumDump", "rep", repHas("cumDump"), "lust", "Keeper, you've a bit on your collar. And your chin. And your hair.", [
    "",
    "",
    "Breakfast.",
    "Last night's. Want to add to it?",
  ], ["", "", "Hearty breakfast.", "...I've got coin."]),
  ex("baronsToy", "rep", repHas("baronsToy"), "scheming", "What's the Baron got you doing today, keeper?", [
    "Nothing! I'm buying flour.",
    "Buying flour. For the Baron.",
    "Whatever pays. Today it's flour.",
    "Listening. You were saying?",
  ], "...Nothing. Nice weather."),
  ex("prideStall", "rep", repHas("pride"), "happy", "Pride of Tarven! Will you bless my stall? Touch the turnips?", [
    "Of course!",
    "For luck? Here.",
    "Touch the turnips. Not the farmer.",
    "Lucky turnips. Double the price.",
  ], "Bless you, keeper!"),
  ex("hire", "treat", late, "scheming", "The painter wants you for a nude, keeper. Interested?", [
    "",
    "",
    "How nude, and how much?",
    "Only if I keep a copy for the bar.",
  ], ["", "", "Very. Very.", "He'll paint you twice."]),
  ex("bet", "treat", lewdRep, "happy", "I've five silver on you getting home dressed today, keeper.", [
    "",
    "Then you'll win.",
    "Then you'd better walk me home.",
    "Then you've lost already.",
  ], ["", "Fingers crossed.", "Gladly.", "Worth it."]),
  ex("jealous", "treat", and(late, lewdRep), "angry", "My husband won't shut up about you, keeper.", [
    "",
    "",
    "Send him round. I'll wear him out for you.",
    "Then come with him. I'll shut you both up.",
  ], ["", "", "...That's not what I meant.", "...What time?"], { sex: "f" }),
  ex("leer", "treat", treatAt("leering", "propositions", "property"), "lust", "Phwoar. Where are you off to, looking like that?", [
    "(Like what? Like WHAT?)",
    "The market. Stop looking.",
    "Somewhere you can't afford.",
    "Your place, if you're quick.",
  ], ["Lucky market.", "Can't help it.", "Try me.", "I'm quick!"]),
  ex("hymn", "treat", (f) => f.fame >= 50 && lewdRep(f), "idolize", "I wrote you a hymn, keeper. Can I sing it? It's mostly moaning.", [
    "",
    "Please don't.",
    "Sing it at the bar tonight.",
    "Sing it in my room. I'll join in.",
  ], ["", "Too late!", "Every verse!", "Gods!"]),
  ex("booking", "treat", late, "calm", "One has heard things, innkeeper. One is appalled. Is Thursday free?", [
    "",
    "",
    "Thursday's free. You aren't.",
    "Thursday's yours. Bring the Baroness.",
  ], ["", "", "...One will pay.", "...She'll insist on it."], { k: ["noble"] }),
  ex("ask", "treat", treatAt("property"), "lust", "Mind if I have a feel, keeper? I'm asking first.", [
    "",
    "",
    "Quick one. Go on.",
    "Go on. Both hands.",
  ], ["", "", "Ta, keeper!", "Gods bless the keeper."]),
];

/** What a townsperson she stops says, her answer, and theirs: the town's talk and the adult script together. */
export const EXCHANGES: readonly TownExchange[] = [...BASE_EXCHANGES, ...ADULT_EXCHANGES];

const ADULT_CHATS: readonly TownChat[] = [
  ...chats("rep.townBike", "rep", repHas("townBike"), true, [
    ["Who's riding the town bike today?", "Whoever's got a copper.", "I've got two.", "Then you can ring the bell."],
    ["The keeper's had more riders than the post horse.", "And never once gone lame."],
  ]),
  ...chats("rep.bitchInHeat", "rep", repHas("bitchInHeat"), true, [
    ["Keeper's in heat again.", "How can you tell?", "Rubbed up against the well. The well.", "Lucky well."],
    ["Lock your husbands up. The keeper's on the prowl.", "Mine's already out the window."],
    [["Here, keeper keeper keeper! ...Here, girl!", "You can't call her like a dog!", "She came, didn't she?"], { loud: true, b: F }],
    [["Here, keeper keeper keeper! ...Here, boy!", "You can't call him like a dog!", "He came, didn't he?"], { loud: true, b: M }],
  ]),
  ...chats("rep.freeUse", "rep", repHas("freeUse"), true, [
    ["Is it true the keeper's free use?", "Only on days ending in -day.", "That's all of them.", "Exactly."],
    [["Free use, keeper? Mind if we both use?", "We're asking!", "Asking nicely!"], { loud: true }],
  ]),
  ...chats("rep.cumDump", "rep", repHas("cumDump"), true, [
    ["Keeper took the whole garrison, they say.", "Every man?", "Every man. Pike took notes."],
    ["They call {her} the cum-dump of the pass.", "Harsh.", "{She} had it painted on a sign."],
  ]),
  ...chats("rep.misc", "rep", undefined, true, [
    [["The Warm House wants the keeper as high priestess.", "Of what?", "Of everything, from the look of it."], { w: repHas("warmHouseFav") }],
    [["Keeper's in the Baron's pocket.", "Which pocket?", "The one he keeps his hand in."], { w: repHas("baronsToy") }],
    [["Pride of Tarven, that one.", "Even after the... you know?", "Especially after. Takes nerve."], { w: and(repHas("pride"), lewdRep) }],
    [["Look at the keeper. Pride of Tarven.", "Good heart.", "Wren's heart."], { w: and(repHas("pride"), cleanRep) }],
  ]),
  ...chats("role", "role", undefined, true, [
    [["Did the Reeve really pass the dress law naked?", "To show it worked.", "It worked. I voted twice."], { w: and(roleIs("reeve"), lewdRep) }],
    [["All hail the Reeve!", "...And {hers} lovely arse!", "Shh! {She}'s the law now!"], { w: and(roleIs("reeve"), lewdRep), loud: true }],
    [["The Reeve fixed the well.", "In a week!", "Pell took three years to lose the bucket."], { w: and(roleIs("reeve"), cleanRep) }],
    [["The Councillor broke the tie with {hers} mouth, I heard.", "On the motion?", "On the mover."], { w: and(roleIs("council"), lewdRep) }],
    [["The new knight sleeps in the barracks.", "Whose bunk?", "All of them. On rotation."], { w: and(roleIs("knight"), lewdRep) }],
    [["The {Role}'s doing the rounds.", "Recruiting?", "Inspecting. Personally."], { w: roleIs("madam") }],
    [["The {Role} blessed my cock, they say.", "Did it work?", "It's never been so blessed."], { w: and(roleIs("priestess"), lewdRep) }],
  ]),
  ...chats("treat", "treat", undefined, true, [
    [["Odds on the keeper staying dressed till noon?", "Ten to one against.", "I'll take that."], { w: lewdRep }],
    [["Look at {her}, swanning about.", "You're jealous.", "Of course I'm jealous. Look at {her}!"], { sex: "f", w: and(late, lewdRep) }],
    [["Poor love. Someone should take {her} for a sit-down.", "Everybody's tried taking {her} somewhere."], { sex: "f", w: (f) => f.respect <= -3 && lewdRep(f) }],
    [["I lit a candle to the keeper.", "In the chapel?", "In my bedroom. Every night."], { w: (f) => f.fame >= 50 && lewdRep(f) }],
    [["Painter wants the keeper nude for the ceiling.", "Which ceiling?", "The chapel's. Oden's thrilled. Ish."], { w: late }],
    [["Scandalous creature.", "Utterly.", "Shall we book Thursday?", "Obviously."], { k: ["noble"], w: late }],
    [["Did you get a squeeze of the keeper this morning?", "Asked. Got a no.", "Asked nicely?", "Got a nice no."], { w: treatAt("property") }],
  ]),
  ...chats("arc2", "arc", undefined, true, [
    [["Keeper let Hobb's hand stay a whole song.", "Which song?", "The long one. All nine verses."], { w: stage("curious") }],
    [["Keeper's taking bookings now.", "Bookings for what?", "Not the stew, love."], { w: stage("willing") }],
    [["Keeper took three at once, I heard.", "Three what?", "Three of Pike's lads. And then Pike."], { w: stage("known") }],
    [["Saw the keeper with the baker this morning.", "Pressed up against him like a cat.", "He dropped every loaf."], { w: repHas("bitchInHeat") }],
  ]),
];

/** Two townsfolk standing together: the town's talk and the adult script together. */
export const CHATS: readonly TownChat[] = [...BASE_CHATS, ...ADULT_CHATS];

// ---------- Heat moments: her own want takes over mid-talk ----------

/** Passives that run her hot (passives.ts): each makes a heat moment likelier. */
export const HEAT_PASSIVES: readonly string[] = [
  "aching",
  "alwaysWanting",
  "insatiable",
  "restless",
  "restlessHands",
  "nightlyRitual",
  "curiousHeat",
  "unashamedHeat",
  "meltingPoint",
  "wantsItMore",
  "eager",
  "daydreamer",
];
/** The most a heat moment's chance can be, talking to someone; a passing word is a fraction of that. */
export const HEAT_MAX_CHANCE = 0.55;
export const PASSING_HEAT_SHARE = 0.3;

/**
 * How likely her heat takes over this talk: high desire, lust and flirt, heat passives, drink and low willpower all
 * push it up; her arc sets how far it can go. `passing` is a word in the street, `talk` stopping to talk.
 */
export function heatChance(f: TownFacts, context: "talk" | "passing" = "talk"): number {
  if (f.passedOut) return 0;
  let chance = 0;
  chance += (Math.max(0, f.desire - 40) / 60) * 0.35;
  chance += (Math.max(0, f.lust - 4) / 6) * 0.15;
  chance += (Math.max(0, f.flirt - 4) / 6) * 0.08;
  chance += Math.min(3, HEAT_PASSIVES.filter((id) => f.passives.has(id)).length) * 0.06;
  if (f.drunk >= 0.3) chance += f.drunk * 0.12;
  if (f.willpower < 0.5) chance += (0.5 - f.willpower) * 0.2;
  chance *= [0.3, 0.7, 1, 1.2][stageIndex(f.arc)];
  if (context === "passing") chance *= PASSING_HEAT_SHARE;
  return Math.min(HEAT_MAX_CHANCE, Math.max(0, chance));
}

/** How likely she catches herself: willpower holds, desire and drink pull, and early on she's still shocked at herself. */
export function heatResistChance(f: TownFacts): number {
  const stageEdge = [0.25, 0.1, 0, -0.1][stageIndex(f.arc)];
  const resist = 0.15 + f.willpower * 0.75 - Math.max(0, f.desire - 50) / 200 - f.drunk * 0.25 + stageEdge;
  return Math.min(0.92, Math.max(0.05, resist));
}

/** How the one she's talking to takes it. */
export type HeatReaction = "delighted" | "flustered" | "takesUp" | "callsFriends" | "flees" | "declines";
/** What she does as her heat shows. */
export type HeatAct = "squirm" | "stare" | "press" | "beg" | "blush";
/** What she offered, when she gave in: a scene the game can play later. */
export type HeatOffer = "kiss" | "touch" | "tonight" | "alley" | "upstairs";

export interface HeatBeat {
  who: "her" | "them";
  text: string;
  /** Hers, kept to herself: shown as a thought, not a bubble. */
  thought: boolean;
  act?: TownAct | HeatAct;
  mood: Mood;
}

export interface HeatMoment {
  id: string;
  beats: HeatBeat[];
  outcome: "resisted" | "gaveIn";
  reaction: HeatReaction;
  /** What she offered and they took up, or null (she caught herself, they ran, or she was too drunk to ask). */
  offer: HeatOffer | null;
  /** What it does to her: the game adds these on (Persona respect, fame, lust; her desire meter). */
  effects: { respect?: number; fame?: number; lust?: number; desire?: number };
  /** A line for the log. */
  summary: string;
}

interface HeatPiece {
  id: string;
  text: string;
  b?: HeroBody;
  stages?: readonly ArcStage[];
  k?: readonly GuestKind[];
  act?: TownAct | HeatAct;
  offer?: HeatOffer;
}

type HeatEntry = string | readonly [string, Omit<HeatPiece, "id" | "text">];

function heatPieces(prefix: string, entries: readonly HeatEntry[]): HeatPiece[] {
  return entries.map((entry, i) => {
    const [text, extra] = typeof entry === "string" ? [entry, {}] : entry;
    return { id: `heat.${prefix}.${i}`, text, ...extra };
  });
}

const EARLY: readonly ArcStage[] = ["sheltered", "curious"];
const LATE: readonly ArcStage[] = ["willing", "known", "legend"];

/** The beats a heat moment is built from (each pool written for both bodies, gated by stage). */
export const HEAT: {
  openers: HeatPiece[];
  slips: HeatPiece[];
  first: Record<HeatReaction, HeatPiece[]>;
  pushes: HeatPiece[];
  caughtThoughts: HeatPiece[];
  caughtSay: HeatPiece[];
  caughtBack: Record<HeatReaction, HeatPiece[]>;
  offers: HeatPiece[];
  taken: Record<HeatReaction, HeatPiece[]>;
} = {
  openers: heatPieces("open", [
    "Morning, keeper. Lovely weather.",
    "Keeper! Got a minute?",
    ["Turnips are good this week, keeper, if you're buying.", { k: ["farmer"] }],
    ["Keeper! Seen my goat? Big, white, bites.", { k: ["farmer"] }],
    ["Morning, keeper. On patrol. Nothing to report.", { k: ["soldier"] }],
    ["Keeper. Want to see my sword drill? The lads say it's very good.", { k: ["soldier"] }],
    ["Keeper. Got a moment? I've a crate that needs a home.", { k: ["smuggler"] }],
    ["Sorry, keeper. Could you tell me the way to the gate?", { k: ["fugitive"] }],
    ["Keeper! New sword. Look how long it is.", { k: ["adventurer"] }],
    ["Keeper. Corran's asking after the protection money.", { k: ["bandit"] }],
    ["Innkeeper. Is the road to the keep passable today?", { k: ["noble"] }],
  ]),
  slips: heatPieces("slip", [
    ["Yes. Lovely. Very big. Your... turnips. The turnips are big.", { stages: ["sheltered"] }],
    ["Sorry, what? I was— don't look at it— listening. I was listening.", { stages: ["sheltered"] }],
    ["I'm fine! Is it hot? It's hot. Is it just me? It's just me.", { stages: ["sheltered"], act: "blush" }],
    ["Mm. Yes. Sorry. You have very nice hands. Big hands.", { stages: ["curious"], act: "stare" }],
    ["Oh, I'd love to. I mean, to see. The— whatever you said.", { stages: ["curious"] }],
    ["Sorry, I didn't hear a word. I was thinking about your mouth.", { stages: ["curious"], act: "stare" }],
    ["Gods, you smell good. Sorry. Carry on. Don't stop talking.", { stages: ["willing"] }],
    ["Mm-hm. I was wondering how you'd look with your trousers off.", { stages: ["willing"], act: "stare" }],
    ["Sure, sure. Do you want to fuck? Sorry. That slipped out.", { stages: ["willing"] }],
    ["Never mind that. Is that a cock in your breeches or a cucumber?", { stages: ["known"], act: "stare" }],
    ["Shh. Talk later. I need something inside me and you'll do.", { stages: ["known"] }],
    ["Gods, I'm dripping. Sorry. Go on. No, don't. Touch me.", { stages: ["known"], b: F }],
    ["Gods, I'm hard as a post. Sorry. Go on. No, don't. Touch me.", { stages: ["known"], b: M }],
  ]),
  first: {
    delighted: heatPieces("first.delighted", ["Ha! Well, well. Morning to you too, keeper.", "Is that so? Go on, then. Tell me more."]),
    flustered: heatPieces("first.flustered", ["I— er— what? Pardon? The turnips?", "Keeper! There are people! Right there!"]),
    takesUp: heatPieces("first.takesUp", ["I've a few minutes, if you've got the need.", "Say that again, slower. I want to be sure."]),
    callsFriends: heatPieces("first.callsFriends", ["Lads! LADS! Come and hear this!", "Hold that thought, keeper. Oi! Hobb! Over here!"]),
    flees: heatPieces("first.flees", ["I— I beg your pardon?", "Good heavens. Keeper, are you unwell?"]),
    declines: heatPieces("first.declines", ["Steady, keeper. You're swaying.", "Whoa there. How much have you had?"]),
  },
  pushes: heatPieces("push", [
    ["I'm just— my legs are restless. Stop squirming. I'm not squirming.", { stages: EARLY, act: "squirm" }],
    ["Sorry, I keep staring at your... belt. It's a nice belt.", { stages: EARLY, act: "stare" }],
    ["Could you stand closer? It's cold. It's not cold. Stand closer.", { stages: EARLY, act: "press" }],
    ["Feel how warm I am. Here. No, lower.", { stages: LATE, act: "press" }],
    ["Please. Just a minute behind the stall. Please.", { stages: LATE, act: "beg" }],
    ["I'm staring at your crotch. I know. I'm not stopping.", { stages: LATE, act: "stare" }],
    ["Mm. Rub against me? Like that. Just like that.", { stages: LATE, act: "press" }],
    ["Don't make me beg in the street. ...Fine. I'm begging.", { stages: LATE, act: "beg" }],
    ["*squirms* Gods, I can't stand still. I can't think.", { stages: LATE, act: "squirm" }],
  ]),
  caughtThoughts: heatPieces("caught.thought", [
    ["(What am I DOING? In the STREET?)", { stages: EARLY }],
    ["(Mother. Think of Mother. Think of cold porridge.)", { stages: EARLY }],
    ["(Never again. Never, ever again.)", { stages: EARLY }],
    ["(Not here. Not in the square. Not for free.)", { stages: LATE }],
    ["(Get a grip. On something that isn't them.)", { stages: LATE }],
    ["(Hold it till five. Hold it till five.)", { stages: LATE }],
  ]),
  caughtSay: heatPieces("caught.say", [
    "I— the flour! I have to buy flour! Goodbye!",
    "Forget I said anything. Anything at all.",
    "Sorry. Heat. Weather. Goodbye!",
    "Ignore me. I've been drinking. I haven't. Goodbye!",
    "That was a joke! Ha! A tavern joke!",
    "Tonight. Maybe. No. Goodbye!",
  ]),
  caughtBack: {
    delighted: heatPieces("back.delighted", ["Shame. The offer stands, keeper.", "Ha! Find me tonight when you change your mind."]),
    flustered: heatPieces("back.flustered", ["I'll... pretend that didn't happen.", "Right. Flour. Good. Yes."]),
    takesUp: heatPieces("back.takesUp", ["Door's open when you're ready.", "Pity. I'd cleared my afternoon."]),
    callsFriends: heatPieces("back.callsFriends", ["Aw, you missed it, lads. {She} ran off!", "Too late, lads. The keeper's bolted."]),
    flees: heatPieces("back.flees", ["Is {she} gone? Is it safe?", "I need to sit down. In the chapel."]),
    declines: heatPieces("back.declines", ["Go and have some water, keeper.", "Sleep it off, love."]),
  },
  offers: heatPieces("offer", [
    ["Kiss me. Just once. Now. Before I lose my nerve.", { stages: EARLY, offer: "kiss" }],
    ["Would you... touch me? Anywhere. Quickly. Please.", { stages: EARLY, offer: "touch" }],
    ["Come to the tavern tonight. After close. Don't tell anyone.", { stages: EARLY, offer: "tonight" }],
    ["Behind the bakehouse. Now. I'm not asking twice.", { stages: LATE, offer: "alley" }],
    ["My room. Now. I'll pay you, if that's what it takes.", { stages: LATE, offer: "upstairs" }],
    ["Fuck me against that wall. I'm serious. Please.", { stages: LATE, offer: "alley" }],
    ["Take me upstairs at the Copper Bell. I don't care whose bed.", { stages: LATE, offer: "upstairs" }],
    ["Bend me over the trough. Everyone's seen it anyway.", { stages: ["known"], offer: "alley" }],
    ["Get your cock out. I need it in my mouth. Right now.", { stages: ["known"], offer: "alley" }],
  ]),
  taken: {
    delighted: heatPieces("taken.delighted", ["Gods, yes. Lead the way, keeper.", "Best day of my life. Hold my basket."]),
    flustered: heatPieces("taken.flustered", ["I— yes? Yes! I need to sit down first.", "Oh gods. Oh gods, yes. Where?"]),
    takesUp: heatPieces("taken.takesUp", ["Say no more. After you.", "Thought you'd never ask. Come on."]),
    callsFriends: heatPieces("taken.callsFriends", ["Oi! LADS! The keeper's offering! Form a queue!", "Hobb! Dunn! Over here, the keeper's in heat!"]),
    flees: heatPieces("taken.flees", ["MOTHER!", "I'm married! To the chapel! Goodbye!"]),
    declines: heatPieces("taken.declines", ["You're too far gone, keeper. Ask me sober and I'll say yes.", "Not like this, love. Sleep it off. Then ask."]),
  },
};

const REACTION_MOOD: Record<HeatReaction, Mood> = {
  delighted: "lust",
  flustered: "scared",
  takesUp: "lust",
  callsFriends: "happy",
  flees: "scared",
  declines: "calm",
};

/** How someone takes her heat: the bold delight in it or take her up on it, the prim fluster or run. */
export function heatReactionWeights(who: Townsperson, f: TownFacts): Record<Exclude<HeatReaction, "declines">, number> {
  const w = { delighted: 2, flustered: 2, takesUp: 1, callsFriends: 1, flees: 0.3 };
  const bold = ["soldier", "bandit", "adventurer"].includes(who.kind);
  if (bold) Object.assign(w, { delighted: 3, takesUp: 2, callsFriends: 3, flustered: 0.6, flees: 0.1 });
  if (who.kind === "smuggler") Object.assign(w, { takesUp: 3, delighted: 2, callsFriends: 0.5 });
  if (who.kind === "noble") Object.assign(w, { flustered: 3, flees: who.female ? 3 : 1, takesUp: 1.5, callsFriends: 0.2 });
  if (who.kind === "fugitive") Object.assign(w, { flustered: 4, flees: 2, callsFriends: 0 });
  if (who.race === "orc") Object.assign(w, { takesUp: 5, flees: 0 });
  if (who.race === "goblin") Object.assign(w, { takesUp: 3, delighted: 3 });
  if (who.race === "elf") Object.assign(w, { flustered: 4 });
  if (who.female) w.flustered += 1;
  // Her name's gone ahead of her: the bold don't keep it to themselves.
  if (repHas("townBike", "bitchInHeat", "freeUse")(f)) w.callsFriends *= 2;
  return w;
}

function pickPiece(pool: readonly HeatPiece[], f: TownFacts, who: Townsperson, recent: RecentLines, random: () => number): HeatPiece | null {
  const fitting = pool.filter((p) => (!p.b || p.b === f.body) && (!p.stages || atStage(p.stages, f.arc)));
  const voiced = fitting.filter((p) => p.k?.includes(who.kind));
  const open = fitting.filter((p) => !p.k);
  const usable = [...voiced, ...open];
  if (usable.length === 0) return null;
  const fresh = usable.filter((p) => !recent.has(p.id));
  const from = fresh.length > 0 ? fresh : usable;
  // Their own kind's lines first, when there are any fresh.
  const freshVoiced = from.filter((p) => p.k);
  const piece = freshVoiced.length > 0 && random() < 0.6 ? freshVoiced[Math.floor(random() * freshVoiced.length) % freshVoiced.length] : from[Math.floor(random() * from.length) % from.length];
  recent.add(piece.id);
  return piece;
}

const OFFER_WORDS: Record<HeatOffer, string> = {
  kiss: "a kiss",
  touch: "a touch",
  tonight: "a night after close",
  alley: "a quick one behind the bakehouse",
  upstairs: "a bed",
};

const REACTION_WORDS: Record<HeatReaction, string> = {
  delighted: "They said yes, delighted.",
  flustered: "They stammered a yes.",
  takesUp: "They took her up on it.",
  callsFriends: "They called their friends over.",
  flees: "They fled.",
  declines: "{She} was too drunk: they told {her} to ask again sober.",
};

function effectWords(e: HeatMoment["effects"]): string {
  const parts = [
    e.respect ? `Respect ${e.respect > 0 ? "+" : ""}${e.respect}` : "",
    e.fame ? `Fame +${e.fame}` : "",
    e.lust ? `Lust +${e.lust}` : "",
  ].filter(Boolean);
  return parts.length ? ` ${parts.join(", ")}.` : "";
}

/**
 * Her heat takes over a talk: her lines go needy, her thoughts slip out loud, she squirms and stares and presses
 * close, and then either catches herself (her willpower held) or makes an offer (it didn't). Whoever she's talking to
 * reacts by who they are and by what the town calls her. `opener` false when their line has already been said (a
 * passing word). Null when nothing fits or she's passed out. The chance it happens at all is `heatChance`.
 *
 * Her offer is hers to make, so it's never a touch on her that she didn't ask for. With Consent On, being too drunk
 * still stops it: they turn her down and tell her to ask sober.
 */
export function pickHeatMoment(
  f: TownFacts,
  who: Townsperson,
  recent: RecentLines,
  random: () => number = Math.random,
  { opener = true }: { opener?: boolean } = {},
): HeatMoment | null {
  if (f.passedOut) return null;
  const resisted = random() < heatResistChance(f);
  const weights = heatReactionWeights(who, f);
  let reaction: HeatReaction = weighted(Object.keys(weights) as (keyof typeof weights)[], (r) => weights[r], random) ?? "flustered";
  const tooDrunk = !f.consentOff && f.drunk >= TOO_DRUNK_TO_YES;
  if (!resisted && tooDrunk && reaction !== "flees") reaction = "declines";

  const parts: HeatPiece[] = [];
  const beats: HeatBeat[] = [];
  const them = (pool: readonly HeatPiece[]) => {
    const piece = pickPiece(pool, f, who, recent, random);
    if (!piece) return false;
    parts.push(piece);
    beats.push({ who: "them", text: fillFor(piece.text, f), thought: false, act: piece.act, mood: REACTION_MOOD[reaction] });
    return true;
  };
  const her = (pool: readonly HeatPiece[], thought = false) => {
    const piece = pickPiece(pool, f, who, recent, random);
    if (!piece) return null;
    parts.push(piece);
    beats.push({ who: "her", text: fillFor(piece.text, f), thought, act: piece.act, mood: "lust" });
    return piece;
  };

  if (opener && !them(HEAT.openers)) return null;
  if (!her(HEAT.slips)) return null;
  them(HEAT.first[reaction]);
  if (!her(HEAT.pushes)) return null;

  let offer: HeatOffer | null = null;
  const effects: HeatMoment["effects"] = {};
  let summary: string;
  if (resisted) {
    her(HEAT.caughtThoughts, true);
    her(HEAT.caughtSay);
    them(HEAT.caughtBack[reaction]);
    effects.respect = -1;
    effects.desire = 5;
    summary = fillFor(`{Hers} heat nearly took over, talking to the ${who.kind}. {She} caught {herself}.${effectWords(effects)}`, f);
  } else {
    const made = her(HEAT.offers);
    them(HEAT.taken[reaction]);
    offer = reaction === "flees" || reaction === "declines" ? null : (made?.offer ?? null);
    effects.respect = known(f) ? -1 : -2;
    effects.fame = reaction === "callsFriends" ? 2 : 1;
    effects.lust = 1;
    effects.desire = 10;
    const offered = made?.offer ? OFFER_WORDS[made.offer] : "{herself}";
    summary = fillFor(`{Hers} heat took over: {she} offered the ${who.kind} ${offered}. ${REACTION_WORDS[reaction]}${effectWords(effects)}`, f);
  }
  return {
    id: parts.map((p) => p.id).join("+"),
    beats,
    outcome: resisted ? "resisted" : "gaveIn",
    reaction,
    offer,
    effects,
    summary,
  };
}

/** Every line the town's talk can say, raw (tokens unfilled): for checking they all fit a bubble. */
export function allTownTexts(): string[] {
  const heat = Object.values(HEAT).flatMap((pool) => (Array.isArray(pool) ? pool : Object.values(pool).flat()));
  return [
    ...PASSING.map((l) => l.text),
    ...Object.values(REPLIES).flatMap((pool) => Object.values(pool).flatMap((lines) => lines ?? [])),
    ...TOO_DRUNK_NO,
    ...EXCHANGES.flatMap((e) => [e.npc, ...e.her, ...(typeof e.back === "string" ? [e.back] : (e.back ?? []))]),
    ...CHATS.flatMap((c) => c.lines),
    ...HUSHES.flat(),
    ...heat.map((p) => p.text),
  ];
}

// ---------- Picking ----------

/** Lines said lately, so nothing comes round again too soon. */
export class RecentLines {
  private readonly ids: string[] = [];
  constructor(readonly size = 40) {}
  has(id: string): boolean {
    return this.ids.includes(id);
  }
  /** The line said last, or null. */
  get last(): string | null {
    return this.ids[this.ids.length - 1] ?? null;
  }
  add(id: string): void {
    const at = this.ids.indexOf(id);
    if (at >= 0) this.ids.splice(at, 1);
    this.ids.push(id);
    while (this.ids.length > this.size) this.ids.shift();
  }
  clear(): void {
    this.ids.length = 0;
  }
}

/** Whether a line can be said by this speaker to this heroine. */
function fits(gate: Gate & { when?: When }, f: TownFacts, who: Townsperson): boolean {
  if (gate.b && gate.b !== f.body) return false;
  if (gate.k && !gate.k.includes(who.kind)) return false;
  if (gate.r && (!who.race || !gate.r.includes(who.race))) return false;
  if (gate.sex === "f" && !who.female) return false;
  if (gate.sex === "m" && who.female) return false;
  // Consent On (GAME_PATH.MD): every hand asks first. Passed out: nothing at all.
  if (gate.lands && !f.consentOff) return false;
  if (f.passedOut) return false;
  return gate.when ? gate.when(f) : true;
}

const voiced = (gate: Gate) => (gate.k || gate.r ? VOICED_WEIGHT : 1);

/**
 * How loud a state is in the street: the more it shows, the more of the talk it takes. Being bare in the square
 * drowns out everything; a passive only a few have heard of is a murmur.
 */
export function salience(category: TownCategory, f: TownFacts): number {
  switch (category) {
    case "dress":
      return f.dress === "naked" ? 26 : f.dress === "topless" || f.dress === "bareBottom" ? 22 : f.dress === "underwear" ? 10 : 4;
    case "mess":
      return 14;
    case "drunk":
      return f.drunk >= 0.6 ? 9 : 3;
    case "outfit":
      return f.outfit === "lingerie" || f.outfit === "revealing" ? 5 : 3;
    case "fame":
      // Unknown is a murmur; famous is a crowd.
      return f.fame >= 80 ? 5 : f.fame >= 20 ? 3 : 1;
    case "title":
    case "lust":
    case "debuff":
      return 4;
    case "arc":
    case "respect":
    case "passive":
    case "lantern":
    case "plot":
      return 3;
    case "role":
      // A respected standing next to a filthy name: the comedy at the heart of it.
      return lewdName(f) ? 7 : 4;
    case "rep":
      return 3;
    case "treat":
      return 2.5;
    case "corruption":
    case "trust":
    case "will":
      return 2;
    case "fans":
      return 1.5;
    default:
      return 1;
  }
}

function weighted<T>(items: readonly T[], weight: (item: T) => number, random: () => number): T | null {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1] ?? null;
}

/**
 * Picks among lines: one keyed to her state most of the time (`keyedShare`) when any fits, the louder states more
 * often, and within a category the lines written for this speaker's kind or people first.
 */
function pickKeyed<T extends { category: TownCategory } & Gate>(lines: readonly T[], f: TownFacts, random: () => number, keyedShare: number, extra: (line: T) => number = () => 1): T | null {
  const keyed = lines.filter((l) => STATE.has(l.category));
  const flavour = lines.filter((l) => !STATE.has(l.category));
  // Something loud about her (bare, messy, roaring drunk) and the town hardly talks of anything else.
  if (keyed.some((l) => salience(l.category, f) >= LOUD_STATE)) keyedShare = Math.max(keyedShare, LOUD_KEYED_SHARE);
  const pool = keyed.length > 0 && (flavour.length === 0 || random() < keyedShare) ? keyed : flavour;
  if (pool.length === 0) return null;
  const byCategory = new Map<TownCategory, T[]>();
  for (const line of pool) byCategory.set(line.category, [...(byCategory.get(line.category) ?? []), line]);
  const category = weighted([...byCategory.keys()], (c) => salience(c, f), random);
  const within = category ? byCategory.get(category)! : pool;
  return weighted(within, (line) => voiced(line) * extra(line), random);
}

/** Every passing line this speaker could say to her right now. */
export function passingLinesFor(f: TownFacts, who: Townsperson): TownLine[] {
  return PASSING.filter((line) => fits(line, f, who));
}

/** A line a passer-by says to her, already filled in. */
export interface PassingPick {
  id: string;
  text: string;
  category: TownCategory;
  /** Whether it reads her state (not just the hour or the town). */
  keyed: boolean;
  mood: Mood;
  /** What they do as they say it, if anything. A grope only ever comes with the Consent switch off. */
  act?: TownAct;
  /** They asked her something (a touch): her answer comes with `pickReply`. */
  ask?: boolean;
}

/**
 * What a townsperson says as she passes them: keyed to her state most of the time, never one said lately (it's
 * added to `recent`), or null if nothing fits.
 */
export function pickPassingLine(f: TownFacts, who: Townsperson, recent: RecentLines, random: () => number = Math.random): PassingPick | null {
  if (f.passedOut) return null;
  const fresh = passingLinesFor(f, who).filter((line) => !recent.has(line.id));
  const line = pickKeyed(fresh, f, random, KEYED_SHARE);
  if (!line) return null;
  recent.add(line.id);
  return {
    id: line.id,
    text: fillFor(line.text, f),
    category: line.category,
    keyed: STATE.has(line.category),
    mood: line.mood,
    act: line.act,
    ask: line.ask,
  };
}

/** Her answer, said out loud or (in parentheses) thought. */
export interface HerReply {
  text: string;
  thought: boolean;
  /** To a line that asked her something: yes or no. A no stands, and too drunk is always a no with Consent On. */
  answer?: "yes" | "no";
}

/** Her answer to a passing line, for her stage, or null when she lets it go. */
export function pickReply(lineId: string, f: TownFacts, random: () => number = Math.random): HerReply | null {
  const line = LINE_BY_ID.get(lineId);
  if (!line || f.passedOut) return null;
  if (line.ask) return answerAsk(f, random);
  const own = line.reply?.[stageIndex(f.arc)];
  const pool = own ? [own] : replyPool(line.replyKey, f.arc);
  if (!pool || pool.length === 0) return null;
  const text = fillFor(pool[Math.floor(random() * pool.length) % pool.length], f);
  return { text, thought: text.startsWith("(") };
}

/** A short talk when she stops: their line, hers, and maybe their comeback. */
export interface ExchangePick {
  id: string;
  npc: string;
  her: HerReply;
  back: string | null;
  mood: Mood;
  category: TownCategory;
}

/** Every exchange this speaker could open with her right now (her stage must have a line in it). */
export function exchangesFor(f: TownFacts, who: Townsperson): TownExchange[] {
  return EXCHANGES.filter((e) => fits(e, f, who) && exchangeHer(e, f.arc) !== "");
}

/**
 * What a townsperson she stops to talk to says, and how it goes, or null if nothing fits. One said lately is only
 * picked again when every other has been.
 */
export function pickExchange(f: TownFacts, who: Townsperson, recent: RecentLines, random: () => number = Math.random): ExchangePick | null {
  if (f.passedOut) return null;
  const all = exchangesFor(f, who);
  const fresh = all.filter((e) => !recent.has(e.id));
  // Stopping to talk should always get an answer: once they're all said, any but the last will do.
  const e = pickKeyed(fresh.length > 0 ? fresh : all.filter((e) => e.id !== recent.last), f, random, KEYED_SHARE);
  if (!e) return null;
  recent.add(e.id);
  const s = stageIndex(f.arc);
  const her = fillFor(exchangeHer(e, f.arc), f);
  const back = typeof e.back === "string" ? e.back : (e.back?.[s] ?? "");
  return {
    id: e.id,
    npc: fillFor(e.npc, f),
    her: { text: her, thought: her.startsWith("(") },
    back: back ? fillFor(back, f) : null,
    mood: e.mood,
    category: e.category,
  };
}

/** A conversation between two townsfolk: who says each line (0 the first speaker passed, 1 the second). */
export interface ChatPick {
  id: string;
  lines: { who: 0 | 1; text: string }[];
  aboutYou: boolean;
  /** Meant for her ears: show it plainly even up close. */
  loud: boolean;
}

/**
 * What two townsfolk standing together talk about: her, most of the time (CHAT_ABOUT_HER_SHARE), keyed on her state,
 * or the town. `near` is whether she's close enough to hear: then they either say it to her face (the loud ones),
 * or catch themselves and hush.
 */
export function pickChat(
  f: TownFacts,
  a: Townsperson,
  b: Townsperson,
  recent: RecentLines,
  random: () => number = Math.random,
  near = false,
): ChatPick | null {
  if (f.passedOut) return null;
  const options: (Gate & { chat: TownChat; first: 0 | 1; category: TownCategory })[] = [];
  for (const chat of CHATS) {
    if (recent.has(chat.id)) continue;
    // The first line is said by whichever of the two it fits; the other must at least be able to stand there.
    if (fits(chat, f, a)) options.push({ chat, first: 0, category: chat.category, k: chat.k, r: chat.r });
    else if (fits(chat, f, b)) options.push({ chat, first: 1, category: chat.category, k: chat.k, r: chat.r });
  }
  const picked = pickKeyed(options, f, random, CHAT_ABOUT_HER_SHARE, (o) => (near && o.chat.loud ? 4 : 1));
  if (!picked) return null;
  const { chat, first } = picked;
  recent.add(chat.id);
  if (near && chat.aboutYou && !chat.loud) {
    const hush = HUSHES[Math.floor(random() * HUSHES.length) % HUSHES.length];
    return {
      id: chat.id,
      lines: hush.map((text, i) => ({ who: ((first + i) % 2) as 0 | 1, text: fillFor(text, f) })),
      aboutYou: true,
      loud: false,
    };
  }
  return {
    id: chat.id,
    lines: chat.lines.map((text, i) => ({ who: ((first + i) % 2) as 0 | 1, text: fillFor(text, f) })),
    aboutYou: chat.aboutYou,
    loud: Boolean(chat.loud),
  };
}
