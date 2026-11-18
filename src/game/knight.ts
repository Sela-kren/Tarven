/**
 * The Knight career (KNIGHT_PATH.md, TOWN_DAY.md §6.1): she climbs the Baron's garrison from nothing to its head, and
 * then, late in the game, out of it into the town hall as Reeve (mayor) of Tarven (§6.2).
 *
 * - **The ladder:** Volunteer → Squire → Knight → Knight-Captain → Lead Knight (Commander). Captain Rhea Vance opens it;
 *   each rank is earned (brawls, the drill test, a tourney duel and the oath, a loyal squad, the old commander beaten
 *   or voted out) and checked here by `canPromote`, which says what is still missing.
 * - **What she does:** the drill (a timing minigame scored by `drill`), patrols (short day events with a choice each,
 *   `PATROL_EVENTS` / `resolvePatrol`), raids with her squad (`resolveRaid`, with an order given), and as Commander the
 *   garrison's rules (`GARRISON_RULES`).
 * - **Her double life:** a bold feed post or a Lantern night can cost her a rank if she's caught (`scandal`), unless
 *   she's high enough that the garrison laughs it off. The Baron watches her harder the higher she climbs.
 * - **Ash:** the deserter at her door. As a soldier she can hunt him, hide him, or (high enough, with Rhea's doubts)
 *   clear his name (`ashChoice`).
 * - **Reeve of Tarven:** `mayorEligible`, the town vote (`townVoteShare`) and a first Law board (`LAWS`, `passLaw`).
 *
 * Effects are plain data (`KnightEffects`): favour, scandal and the squad's loyalty live in `KnightState` and are
 * applied here (`applyEffects`); XP, respect, fame, heat and gold belong to her and the tavern, and the game applies
 * them. Every roll takes an injected rng (`() => number` in [0, 1)), so the tests are fixed.
 *
 * The consent rule (GAME_PATH.MD) holds for everything adult the career touches: barracks flirting asks first and
 * Pull away always works; laws such as Free use follow the Consent switch for her (TOWN_DAY.md §6.3, still the user's
 * to confirm). Pure rules, no DOM.
 */
import type { FightOutcome } from "./fight";

export type KnightRng = () => number;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ---------- The ranks ----------

export type KnightRank = "volunteer" | "squire" | "knight" | "captain" | "commander";
export const KNIGHT_RANK_ORDER: readonly KnightRank[] = ["volunteer", "squire", "knight", "captain", "commander"];

/** Where a rank stands on the ladder, 0 (Volunteer) to 4 (Commander). */
export function rankIndex(rank: KnightRank): number {
  return KNIGHT_RANK_ORDER.indexOf(rank);
}

/** What a rank gives her. */
export interface RankEffects {
  /** Added to her brawl hits (the sword: a squire carries one, a knight is trained in it). */
  brawlDamage: number;
  /** Heat each night, only while she's in the garrison's favour (`FAVOUR_GOOD`). Negative is good. */
  heatPerNight: number;
  /** Respect each week from the town for the rank. */
  respectPerWeek: number;
  /** The most of her squad who step into a brawl at her side (loyal ones only: `ALLY_LOYALTY`). */
  squadAllies: number;
  /** How hard the Baron's men watch her, 0 to 4: raises the chance she's caught at her double life. */
  baronWatch: number;
  /** She can lead raids, and set the garrison's rules. */
  raids: boolean;
  rules: boolean;
}

export interface RankDef {
  name: string;
  /** What the town calls her. */
  title: string;
  /** How it's earned and what it's for, in a line each (KNIGHT_PATH.md has the long version). */
  earn: string;
  does: string;
  /** XP on promotion. */
  xp: number;
  effects: RankEffects;
}

export const KNIGHT_RANKS: Readonly<Record<KnightRank, RankDef>> = {
  volunteer: {
    name: "Volunteer",
    title: "the innkeeper with a stick",
    earn: "Rhea lets her sign on.",
    does: "Errands for the garrison, the drill yard, patrols in the market.",
    xp: 0,
    effects: { brawlDamage: 0, heatPerNight: 0, respectPerWeek: 0, squadAllies: 0, baronWatch: 0, raids: false, rules: false },
  },
  squire: {
    name: "Squire",
    title: "the squire behind the bar",
    earn: "Win 5 brawls and pass the drill test.",
    does: "Patrols, escorts, the tourney. Carries a sword into brawls.",
    xp: 20,
    effects: { brawlDamage: 1, heatPerNight: -1, respectPerWeek: 1, squadAllies: 0, baronWatch: 1, raids: false, rules: false },
  },
  knight: {
    name: "Knight",
    title: "Dame of Tarven",
    earn: "Win a tourney duel, swear the oath, 5 patrols and the garrison's favour.",
    does: "Gets a squad of three; harder patrols (the smugglers' carts).",
    xp: 40,
    effects: { brawlDamage: 2, heatPerNight: -1, respectPerWeek: 2, squadAllies: 1, baronWatch: 2, raids: false, rules: false },
  },
  captain: {
    name: "Knight-Captain",
    title: "the Captain",
    earn: "Fame 40, Respect 40, 12 patrols and a loyal squad.",
    does: "Leads the squad on raids: smugglers, the Velvet House, the pass bandits.",
    xp: 60,
    effects: { brawlDamage: 2, heatPerNight: -2, respectPerWeek: 3, squadAllies: 2, baronWatch: 3, raids: true, rules: false },
  },
  commander: {
    name: "Lead Knight (Commander)",
    title: "the Commander",
    earn: "Act 2: beat the old commander in a duel, or win the squad's vote.",
    does: "Sets the garrison's rules and picks every raid. Decides which side the garrison takes.",
    xp: 100,
    effects: { brawlDamage: 3, heatPerNight: -3, respectPerWeek: 4, squadAllies: 3, baronWatch: 4, raids: true, rules: true },
  },
};

/** The old commander she has to beat or vote out (a new character, proposed in KNIGHT_PATH.md). */
export const OLD_COMMANDER = {
  name: "Commander Harlan Voss",
  note: "The Baron's man over Rhea's head: fifty, heavy, good with a sword and better with the Baron's purse.",
} as const;

// ---------- Her state in the career ----------

export interface SquadMember {
  name: string;
  /** 0 to 100. */
  loyalty: number;
}

export type GarrisonRules = "none" | "fair" | "harsh" | "loose";
export type OathTo = "baron" | "town";

export interface KnightState {
  rank: KnightRank;
  /** The garrison's favour, 0 to 100. In favour (`FAVOUR_GOOD`) her rank keeps heat down. */
  favour: number;
  /** Talk about her double life, 0 up; at `SCANDAL_LIMIT` she loses a rank. Fades by day. */
  scandal: number;
  /** Her best drill score, 0 to 100. */
  drillBest: number;
  patrols: number;
  raids: number;
  squad: SquadMember[];
  rules: GarrisonRules;
  tourneyWins: number;
  /** Whom she swore the oath to, or null before it. */
  oath: OathTo | null;
  /** The two roads to Commander. */
  commanderBeaten: boolean;
  voteWon: boolean;
  /** Reeve of Tarven, and the laws, once she is. */
  reeve: boolean;
  laws: LawBoard;
}

/** What the rest of the game knows about her that the ladder asks for. */
export interface KnightFacts {
  brawlsWon: number;
  fame: number;
  respect: number;
  /** The story's act, 1 to 3. */
  act: number;
  /** STORY.md flags that bear on it. */
  rheaDoubts: boolean;
  /** Politics: a council seat (First in Tarven, end of Chapter 1), the Baron fallen, and the last town vote's share. */
  councilSeat: boolean;
  baronFallen: boolean;
  townVote: number;
}

export const FAVOUR_GOOD = 30;
export const ALLY_LOYALTY = 50;
export const SCANDAL_LIMIT = 30;

/** A new volunteer, the day Rhea signs her on. */
export function newKnightState(): KnightState {
  return {
    rank: "volunteer",
    favour: 10,
    scandal: 0,
    drillBest: 0,
    patrols: 0,
    raids: 0,
    squad: [],
    rules: "none",
    tourneyWins: 0,
    oath: null,
    commanderBeaten: false,
    voteWon: false,
    reeve: false,
    laws: { ...BARON_LAWS },
  };
}

/** What her rank gives her today: heat only while she's in favour, and only as many allies as are loyal. */
export function effectsOf(state: KnightState): RankEffects {
  const base = KNIGHT_RANKS[state.rank].effects;
  const loyal = state.squad.filter((m) => m.loyalty >= ALLY_LOYALTY).length;
  let watch = base.baronWatch + (state.oath === "town" ? 1 : state.oath === "baron" ? -1 : 0);
  watch = clamp(watch, 0, 4);
  return {
    ...base,
    heatPerNight: state.favour >= FAVOUR_GOOD ? base.heatPerNight : 0,
    squadAllies: Math.min(base.squadAllies, loyal),
    baronWatch: watch,
  };
}

// ---------- Effects ----------

/** What something does, as data. Favour, scandal and loyalty are the career's; the rest the game applies to her. */
export interface KnightEffects {
  xp?: number;
  favour?: number;
  scandal?: number;
  /** To every member of her squad. */
  loyalty?: number;
  respect?: number;
  fame?: number;
  heat?: number;
  gold?: number;
  /** A STORY.md-style flag it sets (e.g. "ashCaught"). */
  flag?: string;
}

/** The career's share of an effect: favour (0-100), scandal (0 up) and the squad's loyalty (0-100). */
export function applyEffects(state: KnightState, e: KnightEffects): KnightState {
  return {
    ...state,
    favour: clamp(state.favour + (e.favour ?? 0), 0, 100),
    scandal: Math.max(0, state.scandal + (e.scandal ?? 0)),
    squad: state.squad.map((m) => ({ ...m, loyalty: clamp(m.loyalty + (e.loyalty ?? 0), 0, 100) })),
  };
}

// ---------- Promotion ----------

export interface PromotionCheck {
  ok: boolean;
  /** The rank above, or null at the top. */
  next: KnightRank | null;
  /** What she still needs, in plain words (empty when ok). */
  missing: string[];
}

/** Her squad counts as loyal: three or more, loyalty 60 on average. */
export const LOYAL_SQUAD = { size: 3, loyalty: 60 } as const;
export function squadLoyal(squad: readonly SquadMember[]): boolean {
  if (squad.length < LOYAL_SQUAD.size) return false;
  return squad.reduce((n, m) => n + m.loyalty, 0) / squad.length >= LOYAL_SQUAD.loyalty;
}

/** What each step asks. */
export const PROMOTE_AT = {
  squire: { brawlsWon: 5, drill: 60 },
  knight: { tourneyWins: 1, patrols: 5, favour: FAVOUR_GOOD },
  captain: { fame: 40, respect: 40, patrols: 12 },
  commander: { act: 2, scandalUnder: 20 },
} as const;

/** Whether she can step up a rank, and what's missing if not. */
export function canPromote(state: KnightState, facts: KnightFacts): PromotionCheck {
  const i = rankIndex(state.rank);
  const next = KNIGHT_RANK_ORDER[i + 1] ?? null;
  const missing: string[] = [];
  const need = (met: boolean, what: string) => {
    if (!met) missing.push(what);
  };
  if (next === null) return { ok: false, next, missing: ["She's already Commander. The town hall is next (mayorEligible)."] };
  if (next === "squire") {
    const r = PROMOTE_AT.squire;
    need(facts.brawlsWon >= r.brawlsWon, `Win ${r.brawlsWon} brawls (${facts.brawlsWon}/${r.brawlsWon})`);
    need(state.drillBest >= r.drill, `Pass the drill test (best ${state.drillBest}/${r.drill})`);
  } else if (next === "knight") {
    const r = PROMOTE_AT.knight;
    need(state.tourneyWins >= r.tourneyWins, "Win a tourney duel");
    need(state.oath !== null, "Swear the oath");
    need(state.patrols >= r.patrols, `Walk ${r.patrols} patrols (${state.patrols}/${r.patrols})`);
    need(state.favour >= r.favour, `The garrison's favour (${state.favour}/${r.favour})`);
  } else if (next === "captain") {
    const r = PROMOTE_AT.captain;
    need(facts.fame >= r.fame, `Fame ${r.fame} (${facts.fame})`);
    need(facts.respect >= r.respect, `Respect ${r.respect} (${facts.respect})`);
    need(state.patrols >= r.patrols, `Walk ${r.patrols} patrols (${state.patrols}/${r.patrols})`);
    need(squadLoyal(state.squad), `A loyal squad (${LOYAL_SQUAD.size}+, loyalty ${LOYAL_SQUAD.loyalty} on average)`);
  } else {
    const r = PROMOTE_AT.commander;
    need(facts.act >= r.act, `Act ${r.act}`);
    need(state.commanderBeaten || state.voteWon, `Beat ${OLD_COMMANDER.name} in a duel, or win the squad's vote`);
    need(state.scandal < r.scandalUnder, `Less talk about her (scandal ${state.scandal}, under ${r.scandalUnder})`);
  }
  return { ok: missing.length === 0, next, missing };
}

/** The squad she's given as a Knight, and the two more who follow her when she's Commander. */
export const STARTING_SQUAD: readonly SquadMember[] = [
  { name: "Corporal Dunn", loyalty: 30 },
  { name: "Grisha (orc)", loyalty: 30 },
  { name: "Wenna (fox beastfolk)", loyalty: 30 },
];
export const COMMANDER_SQUAD: readonly SquadMember[] = [
  { name: "Old Tobin", loyalty: 50 },
  { name: "Sela Marsh", loyalty: 50 },
];

export interface PromoteResult {
  ok: boolean;
  state: KnightState;
  missing: string[];
  xp: number;
  line: string;
}

/** Step her up a rank if she can: XP, favour +10, and a squad at Knight and more at Commander. */
export function promote(state: KnightState, facts: KnightFacts): PromoteResult {
  const check = canPromote(state, facts);
  if (!check.ok || check.next === null) {
    return { ok: false, state, missing: check.missing, xp: 0, line: "Rhea shakes her head. \"Not yet.\"" };
  }
  const next = check.next;
  let squad = state.squad;
  if (next === "knight") squad = STARTING_SQUAD.map((m) => ({ ...m }));
  if (next === "commander") squad = [...squad, ...COMMANDER_SQUAD.map((m) => ({ ...m }))];
  const lines: Record<KnightRank, string> = {
    volunteer: "",
    squire: "Rhea hands you a sword with a nicked edge. \"Squire. Don't drop it.\"",
    knight: "A blade on each shoulder, and three soldiers who now answer to you.",
    captain: "The garrison salutes you in the yard. Some of them even mean it.",
    commander: "The keys to the armoury are yours. Somewhere up in the keep, the Baron hears about it.",
  };
  return {
    ok: true,
    state: { ...state, rank: next, favour: clamp(state.favour + 10, 0, 100), squad },
    missing: [],
    xp: KNIGHT_RANKS[next].xp,
    line: lines[next],
  };
}

/** One rank down (scandal); a volunteer stays a volunteer. */
export function demote(state: KnightState): KnightState {
  const i = rankIndex(state.rank);
  return { ...state, rank: KNIGHT_RANK_ORDER[Math.max(0, i - 1)] };
}

// ---------- The oath and the tourney ----------

/**
 * The oath, sworn as a squire with a tourney win behind her. To the Baron (the garrison's lord): favour +10 and his men
 * watch her a little less. To the town (Rhea's quiet way, once she has her doubts): Rhea's respect, and he watches more.
 */
export function swearOath(state: KnightState, to: OathTo, facts: KnightFacts): { ok: boolean; state: KnightState; line: string } {
  if (state.rank !== "squire" || state.tourneyWins < 1 || state.oath !== null) {
    return { ok: false, state, line: "The oath is for a squire who has won at the tourney." };
  }
  if (to === "town" && !facts.rheaDoubts) {
    return { ok: false, state, line: "Rhea won't hear an oath to the town. Not yet." };
  }
  if (to === "baron") {
    return { ok: true, state: { ...state, oath: to, favour: clamp(state.favour + 10, 0, 100) }, line: "You kneel and swear to the Baron. Pell writes it down." };
  }
  return { ok: true, state: { ...state, oath: to }, line: "You swear to Tarven, not to him. Rhea's mouth twitches, almost a smile." };
}

/** A tourney duel, played as a brawl Fight one on one: only a win counts. */
export function tourneyDuel(state: KnightState, outcome: FightOutcome): { state: KnightState; effects: KnightEffects; line: string } {
  if (outcome === "won") {
    return { state: { ...state, tourneyWins: state.tourneyWins + 1 }, effects: { xp: 15, fame: 3, favour: 5 }, line: "The crowd roars as your rival goes down in the sand." };
  }
  return { state, effects: { xp: 5 }, line: "You leave the lists in the sand. Next year." };
}

// ---------- The drill (timing minigame) ----------

/** How far off the beat a press may be, in ms, for each grade. With Hikari teaching, every window is 20% wider. */
export const DRILL_WINDOWS = { perfect: 50, good: 120, ok: 220 } as const;
export const DRILL_POINTS = { perfect: 10, good: 6, ok: 3, miss: 0 } as const;
export const DRILL_PASS = 60;
export const HIKARI_WINDOW = 1.2;

export interface DrillResult {
  score: number;
  perfect: number;
  good: number;
  ok: number;
  miss: number;
  xp: number;
  passed: boolean;
}

/**
 * Score a drill: each press's offset from its beat in ms (signed; null for no press). The score is 0 to 100, the share
 * of the most points; it passes at `DRILL_PASS`. XP: a tenth of the score, +1 a perfect, +5 for a pass.
 */
export function drill(timings: readonly (number | null)[], opts: { hikari?: boolean } = {}): DrillResult {
  const w = opts.hikari ? HIKARI_WINDOW : 1;
  const r = { perfect: 0, good: 0, ok: 0, miss: 0 };
  for (const t of timings) {
    const off = t === null ? Infinity : Math.abs(t);
    if (off <= DRILL_WINDOWS.perfect * w) r.perfect++;
    else if (off <= DRILL_WINDOWS.good * w) r.good++;
    else if (off <= DRILL_WINDOWS.ok * w) r.ok++;
    else r.miss++;
  }
  const points = r.perfect * DRILL_POINTS.perfect + r.good * DRILL_POINTS.good + r.ok * DRILL_POINTS.ok;
  const score = timings.length === 0 ? 0 : Math.round((points / (timings.length * DRILL_POINTS.perfect)) * 100);
  const passed = score >= DRILL_PASS;
  return { ...r, score, passed, xp: Math.floor(score / 10) + r.perfect + (passed ? 5 : 0) };
}

/** Keep her best, and a passed drill done with the squad lifts their loyalty by 2. */
export function recordDrill(state: KnightState, r: DrillResult): KnightState {
  const next = { ...state, drillBest: Math.max(state.drillBest, r.score) };
  return r.passed ? applyEffects(next, { loyalty: 2 }) : next;
}

// ---------- Patrols ----------

export interface PatrolChoice {
  id: string;
  label: string;
  /** Chance it goes well, before her rank (+5% a rank). 1 is sure. */
  odds: number;
  /** Played as a brawl Fight when the game can: pass its outcome to resolvePatrol instead of rolling. */
  fight?: boolean;
  win: KnightEffects;
  lose: KnightEffects;
  winLine: string;
  loseLine: string;
}

export interface PatrolEvent {
  id: string;
  name: string;
  minRank: KnightRank;
  intro: string;
  choices: readonly PatrolChoice[];
}

export const PATROL_EVENTS: readonly PatrolEvent[] = [
  {
    id: "thief",
    name: "Stop, thief!",
    minRank: "volunteer",
    intro: "A boy in a hoodie snatches a goblin's phone off the stall and bolts for the alleys.",
    choices: [
      { id: "chase", label: "Run him down", odds: 0.6, win: { xp: 4, favour: 3, respect: 2 }, lose: { xp: 1, respect: -1 }, winLine: "You catch him by the hood two alleys over. The goblin gives you a phone charm.", loseLine: "He's over a wall and gone. The goblin sighs at you." },
      { id: "tackle", label: "Tackle him", odds: 0.7, fight: true, win: { xp: 6, favour: 4, respect: 2, fame: 1 }, lose: { xp: 2, respect: -2 }, winLine: "You flatten him in the gutter to applause and somebody's camera flash.", loseLine: "He squirms free and you're left in the gutter." },
      { id: "warn", label: "Let him go with a warning", odds: 1, win: { xp: 2, favour: -1, respect: 1 }, lose: {}, winLine: "You give the phone back and the boy a talking-to. The soldiers think you're soft.", loseLine: "" },
    ],
  },
  {
    id: "fight",
    name: "Break up a fight",
    minRank: "volunteer",
    intro: "Two farmhands are rolling in the mud outside the Drowned Rat, and a crowd's filming it.",
    choices: [
      { id: "wade", label: "Wade in", odds: 0.65, fight: true, win: { xp: 5, favour: 3, respect: 2 }, lose: { xp: 2, respect: -2 }, winLine: "You haul them apart by their collars and sit them on a trough each.", loseLine: "An elbow catches you and the crowd cheers the wrong side." },
      { id: "talk", label: "Talk them down", odds: 0.5, win: { xp: 4, respect: 3 }, lose: { xp: 1 }, winLine: "A few words and a free round tonight, and they shake on it.", loseLine: "They don't hear a word. Eventually they tire themselves out." },
    ],
  },
  {
    id: "soldier",
    name: "One of their own",
    minRank: "volunteer",
    intro: "A drunk soldier from the garrison won't take no from a farm girl at the well.",
    choices: [
      { id: "order", label: "Order him off", odds: 0.6, win: { xp: 4, respect: 3, favour: -1 }, lose: { xp: 2, respect: 1, favour: -2 }, winLine: "\"She said no. Walk.\" He walks.", loseLine: "He laughs at a volunteer giving orders, but the girl gets away while he does." },
      { id: "rhea", label: "Report him to Rhea", odds: 1, win: { xp: 3, respect: 2, favour: -2 }, lose: {}, winLine: "Rhea nods. \"I'll remind him.\" The barracks call you a snitch for a week.", loseLine: "" },
      { id: "flatten", label: "Knock him down", odds: 0.7, fight: true, win: { xp: 6, respect: 4, favour: -3, fame: 1 }, lose: { xp: 2, respect: 1, favour: -3 }, winLine: "He goes down in the well-mud. The girl's friends film it.", loseLine: "He's bigger than he looked, but his mates drag him off before it goes further." },
    ],
  },
  {
    id: "escort",
    name: "Escort a merchant",
    minRank: "squire",
    intro: "A dwarf merchant with a cart of mana-stones needs a sword as far as the toll gate.",
    choices: [
      { id: "road", label: "Take the high road", odds: 0.8, win: { xp: 5, gold: 8, favour: 2 }, lose: { xp: 2, gold: 2 }, winLine: "Slow and safe. He pays you at the gate and grumbles about the toll.", loseLine: "A wheel cracks on the way, and he pays you half." },
      { id: "short", label: "Cut through the quarry road", odds: 0.5, fight: true, win: { xp: 8, gold: 15, fame: 1 }, lose: { xp: 3, gold: 0, respect: -1 }, winLine: "Bandits try it in the dead-signal stretch and regret it. He pays double.", loseLine: "Bandits take two crates. He takes his custom elsewhere." },
    ],
  },
  {
    id: "cart",
    name: "A smugglers' cart",
    minRank: "knight",
    intro: "Your squad stops a cart with false-bottomed barrels at the gate. The driver knows Silas's name.",
    choices: [
      { id: "seize", label: "Seize it by the book", odds: 0.65, fight: true, win: { xp: 8, favour: 5, heat: -1, loyalty: 3 }, lose: { xp: 3, loyalty: -3 }, winLine: "Salt and brandy for the Baron's store. The squad drinks one barrel quietly.", loseLine: "The driver whistles and the cart's gone up the pass." },
      { id: "cut", label: "Take a cut and wave it through", odds: 1, win: { gold: 12, scandal: 5, loyalty: 2 }, lose: {}, winLine: "A purse, a nod, and the barrels roll on. Your squad saw.", loseLine: "" },
    ],
  },
];

/** The patrols open to her rank. */
export function patrolEvents(rank: KnightRank): PatrolEvent[] {
  return PATROL_EVENTS.filter((e) => rankIndex(e.minRank) <= rankIndex(rank));
}

export interface PatrolResult {
  ok: boolean;
  effects: KnightEffects;
  line: string;
}

/** The odds of a choice for her rank: +5% a rank above Volunteer, never past 95% unless it was sure. */
export function patrolOdds(choice: PatrolChoice, rank: KnightRank): number {
  return choice.odds >= 1 ? 1 : Math.min(0.95, choice.odds + 0.05 * rankIndex(rank));
}

/** Play a patrol choice: rolled, or from the brawl's outcome when it was fought (`fought`, a fight choice only). */
export function resolvePatrol(event: PatrolEvent, choiceId: string, rank: KnightRank, rng: KnightRng, fought?: FightOutcome): PatrolResult {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`No choice ${choiceId} on patrol ${event.id}`);
  const ok = choice.fight && fought !== undefined ? fought !== "lost" : rng() < patrolOdds(choice, rank);
  return ok ? { ok, effects: choice.win, line: choice.winLine } : { ok, effects: choice.lose, line: choice.loseLine };
}

/** Count the patrol and apply its effects to the career. */
export function recordPatrol(state: KnightState, r: PatrolResult): KnightState {
  return applyEffects({ ...state, patrols: state.patrols + 1 }, r.effects);
}

// ---------- Raids ----------

export type RaidTargetId = "smugglers" | "velvet" | "bandits" | "tollhouse";

export interface RaidTarget {
  name: string;
  /** How hard it is, against her squad's power. */
  strength: number;
  minRank: KnightRank;
  win: KnightEffects;
  lose: KnightEffects;
  winLine: string;
  loseLine: string;
}

export const RAID_TARGETS: Readonly<Record<RaidTargetId, RaidTarget>> = {
  smugglers: {
    name: "The smugglers' cave on the quarry road",
    strength: 3,
    minRank: "captain",
    win: { xp: 15, gold: 20, favour: 6, heat: -2, flag: "silasAngry" },
    lose: { xp: 5, favour: -3 },
    winLine: "Crates of salt and a goblin who swears he's never heard of Silas. Silas will hear of you.",
    loseLine: "The cave's empty but for a note: \"Too slow, Captain.\"",
  },
  velvet: {
    name: "Sabine's Velvet House",
    strength: 4,
    minRank: "captain",
    win: { xp: 18, fame: 3, respect: 3, favour: 4, flag: "velvetRaided" },
    lose: { xp: 5, respect: -2, scandal: 5 },
    winLine: "Sabine's ledgers on the table and her girls free to walk out. A few ask where the Lantern is.",
    loseLine: "Sabine meets you at the door with a noble on each arm, and you leave with nothing but talk.",
  },
  bandits: {
    name: "The bandits on the high pass",
    strength: 5,
    minRank: "captain",
    win: { xp: 20, gold: 25, respect: 4, fame: 2 },
    lose: { xp: 6, respect: -1 },
    winLine: "Their camp burns in the snow and the toll road's safe for a season.",
    loseLine: "They knew you were coming. Somebody texted. Never text what you can whisper.",
  },
  tollhouse: {
    name: "The Baron's toll house (the silver)",
    strength: 6,
    minRank: "commander",
    win: { xp: 40, gold: 50, favour: -20, respect: 6, heat: 5, flag: "baronSilverTaken" },
    lose: { xp: 10, favour: -25, heat: 8 },
    winLine: "The Baron's silver, in your squad's hands. There's no going back from this.",
    loseLine: "The toll men hold, and the Baron knows exactly who came for his silver.",
  },
};

export type SquadOrder = "charge" | "flank" | "hold";

/** Squad orders (the minigame): a bolder order is likelier to win and hurts more when it doesn't. */
export const SQUAD_ORDERS: Readonly<Record<SquadOrder, { name: string; odds: number; winLoyalty: number; loseLoyalty: number }>> = {
  charge: { name: "Charge", odds: 0.1, winLoyalty: 8, loseLoyalty: -12 },
  flank: { name: "Flank them", odds: 0, winLoyalty: 5, loseLoyalty: -6 },
  hold: { name: "Hold and press", odds: -0.1, winLoyalty: 3, loseLoyalty: -2 },
};

/** Her squad's power: each member 0.5, plus their loyalty a hundredth. */
export function squadPower(squad: readonly SquadMember[]): number {
  return squad.reduce((n, m) => n + 0.5 + m.loyalty / 100, 0);
}

export function raidOdds(squad: readonly SquadMember[], targetId: RaidTargetId, order: SquadOrder = "flank"): number {
  const t = RAID_TARGETS[targetId];
  return clamp(0.5 + (squadPower(squad) - t.strength) * 0.12 + SQUAD_ORDERS[order].odds, 0.05, 0.95);
}

/** Whether she may lead this raid (her rank, and somebody to lead). */
export function canRaid(state: KnightState, targetId: RaidTargetId): boolean {
  return state.squad.length > 0 && rankIndex(state.rank) >= rankIndex(RAID_TARGETS[targetId].minRank);
}

export interface RaidResult {
  ok: boolean;
  odds: number;
  effects: KnightEffects;
  /** The squad after it: loyalty up on a win, down on a loss. */
  squad: SquadMember[];
  line: string;
}

/** Lead the squad on a raid with an order. */
export function resolveRaid(squad: readonly SquadMember[], targetId: RaidTargetId, rng: KnightRng, order: SquadOrder = "flank"): RaidResult {
  const t = RAID_TARGETS[targetId];
  const odds = raidOdds(squad, targetId, order);
  const ok = rng() < odds;
  const o = SQUAD_ORDERS[order];
  const delta = ok ? o.winLoyalty : o.loseLoyalty;
  return {
    ok,
    odds,
    effects: ok ? t.win : t.lose,
    squad: squad.map((m) => ({ ...m, loyalty: clamp(m.loyalty + delta, 0, 100) })),
    line: ok ? t.winLine : t.loseLine,
  };
}

/** Count the raid: the squad as it came back, and favour and scandal from it. */
export function recordRaid(state: KnightState, r: RaidResult): KnightState {
  const { loyalty: _l, ...rest } = r.effects;
  return applyEffects({ ...state, raids: state.raids + 1, squad: r.squad }, rest);
}

// ---------- The garrison's rules (Commander) ----------

export const GARRISON_RULES: Readonly<Record<Exclude<GarrisonRules, "none">, { name: string; line: string; perDay: KnightEffects; trouble: number }>> = {
  fair: { name: "Fair", line: "Pay on time, hands to themselves, the lash for nobody.", perDay: { loyalty: 1, respect: 1 }, trouble: 0 },
  harsh: { name: "Harsh", line: "Drill at dawn, the stocks for any slip. The Baron approves.", perDay: { loyalty: -1, favour: 2, heat: -1, respect: -1 }, trouble: -0.1 },
  loose: { name: "Loose", line: "Ale in the barracks and a blind eye. The soldiers love you; the town less.", perDay: { loyalty: 2, favour: -1, respect: -1 }, trouble: 0.15 },
};

export function setRules(state: KnightState, rules: GarrisonRules): { ok: boolean; state: KnightState } {
  if (!effectsOf(state).rules) return { ok: false, state };
  return { ok: true, state: { ...state, rules } };
}

// ---------- The old commander: duel or vote ----------

/** The duel with the old commander, played as a brawl Fight: a win (not a talk-down) earns the rank. */
export function commanderDuel(state: KnightState, outcome: FightOutcome): { state: KnightState; line: string } {
  if (state.rank !== "captain") return { state, line: "Only a Captain can call the Commander out." };
  if (outcome === "won") return { state: { ...state, commanderBeaten: true }, line: `${OLD_COMMANDER.name} yields in the yard, red-faced, in front of everyone.` };
  return { state: { ...state, favour: clamp(state.favour - 10, 0, 100) }, line: `${OLD_COMMANDER.name} puts you in the dust and the yard sees it.` };
}

/**
 * The squad's vote: each member votes for her at loyalty `ALLY_LOYALTY` or more, and Rhea does once she has her doubts.
 * She needs a majority and at least three votes. Only a Captain can call it.
 */
export function squadVote(state: KnightState, rheaBacks: boolean): { state: KnightState; yes: number; no: number; won: boolean } {
  let yes = state.squad.filter((m) => m.loyalty >= ALLY_LOYALTY).length;
  let no = state.squad.length - yes;
  if (rheaBacks) yes++;
  else no++;
  const won = state.rank === "captain" && yes > no && yes >= 3;
  return { state: won ? { ...state, voteWon: true } : state, yes, no, won };
}

// ---------- Her double life ----------

export type ScandalKind = "boldPost" | "lanternNight" | "barracksFling" | "defeatSeen" | "ashHidden";

export interface ScandalDef {
  name: string;
  points: number;
  /** From this rank up it's only talk (half the points, never a demotion); null: never safe. */
  safeAt: KnightRank | null;
  /** The chance a night of it is found out, before the Baron's watch. */
  caught: number;
  line: string;
}

export const SCANDALS: Readonly<Record<ScandalKind, ScandalDef>> = {
  boldPost: { name: "A bold post on the feed", points: 10, safeAt: "knight", caught: 0.5, line: "The barracks pass your post round on their phones." },
  lanternNight: { name: "A night at the Lantern", points: 15, safeAt: "captain", caught: 0.3, line: "A soldier swears he saw you upstairs at the Lantern." },
  barracksFling: { name: "A fling in the barracks", points: 5, safeAt: "squire", caught: 0.4, line: "Everyone in the barracks knows whose bunk you were in." },
  defeatSeen: { name: "Seen taken after a lost brawl", points: 10, safeAt: "commander", caught: 0.6, line: "The whole street saw how the brawl ended for you." },
  ashHidden: { name: "Hiding a deserter", points: 30, safeAt: null, caught: 0.15, line: "The garrison finds out who's been hiding Ash." },
};

/** The chance it's found out: the Baron's watch adds a quarter a step. */
export function caughtChance(kind: ScandalKind, state: KnightState): number {
  return Math.min(0.95, SCANDALS[kind].caught * (1 + 0.25 * effectsOf(state).baronWatch));
}

export interface ScandalResult {
  state: KnightState;
  demoted: boolean;
  from: KnightRank;
  to: KnightRank;
  points: number;
  line: string;
}

/**
 * She's caught at it. High enough (`safeAt`), it's only talk: half the points and no risk. Below it, the points add up
 * and at `SCANDAL_LIMIT` she drops a rank, loses 10 favour, and the talk starts over.
 */
export function scandal(state: KnightState, kind: ScandalKind): ScandalResult {
  const def = SCANDALS[kind];
  const from = state.rank;
  const safe = def.safeAt !== null && rankIndex(state.rank) >= rankIndex(def.safeAt);
  if (safe) {
    const points = Math.floor(def.points / 2);
    return { state: { ...state, scandal: state.scandal + points }, demoted: false, from, to: from, points, line: `${def.line} At your rank they only grin.` };
  }
  const total = state.scandal + def.points;
  if (total < SCANDAL_LIMIT) {
    return { state: { ...state, scandal: total }, demoted: false, from, to: from, points: def.points, line: def.line };
  }
  const down = demote(state);
  const demoted = down.rank !== from;
  return {
    state: { ...down, scandal: 0, favour: clamp(state.favour - 10, 0, 100) },
    demoted,
    from,
    to: down.rank,
    points: def.points,
    line: demoted ? `${def.line} Rhea takes your badge: you're ${KNIGHT_RANKS[down.rank].name} again.` : `${def.line} Rhea warns you: once more and you're out.`,
  };
}

/** Talk fades: 2 a day. */
export function fadeScandal(state: KnightState, days: number): KnightState {
  return { ...state, scandal: Math.max(0, state.scandal - 2 * days) };
}

// ---------- Ash ----------

export type AshPath = "hunt" | "hide" | "clear";

export const ASH_PATHS: Readonly<Record<AshPath, { name: string; minRank: KnightRank; effects: KnightEffects; line: string }>> = {
  hunt: { name: "Hunt him", minRank: "volunteer", effects: { xp: 10, favour: 15, respect: -3, heat: -2, flag: "ashCaught" }, line: "You bring Ash in yourself. He doesn't say a word to you on the way." },
  hide: { name: "Hide him", minRank: "volunteer", effects: { flag: "ashHidden" }, line: "Ash stays in the cellar, and you wear the Baron's colours over the secret." },
  clear: { name: "Clear his name", minRank: "captain", effects: { xp: 25, favour: -5, respect: 5, flag: "ashCleared" }, line: "With Rhea's word and the old orders in hand, Ash walks the street under his own name." },
};

/** What she does about Ash. Clearing his name needs Captain and Rhea's doubts; a hidden Ash is a standing risk (`ashHidden`). */
export function ashChoice(state: KnightState, path: AshPath, facts: KnightFacts): { ok: boolean; state: KnightState; effects: KnightEffects; line: string } {
  const def = ASH_PATHS[path];
  if (rankIndex(state.rank) < rankIndex(def.minRank)) return { ok: false, state, effects: {}, line: `Only a ${KNIGHT_RANKS[def.minRank].name} could do that.` };
  if (path === "clear" && !facts.rheaDoubts) return { ok: false, state, effects: {}, line: "Without Rhea on your side, nobody will listen." };
  return { ok: true, state: applyEffects(state, def.effects), effects: def.effects, line: def.line };
}

// ---------- Reeve of Tarven ----------

export const MAYOR_AT = { act: 3, voteShare: 0.5, respect: 50, commanderBonus: 0.1 } as const;

/** The town's blocs in a vote (TOWN_DAY.md §6.2's factions) and how many of a hundred voters each is. */
export type Faction = "farmers" | "merchants" | "soldiers" | "devotees" | "nobles" | "oden";
export const TOWN_BLOCS: Readonly<Record<Faction, number>> = { farmers: 30, merchants: 20, soldiers: 20, devotees: 10, nobles: 10, oden: 10 };

/** A town vote's share for her, 0 to 1, from each bloc's mood toward her (-100 to 100). Commander adds a tenth. */
export function townVoteShare(moods: Partial<Record<Faction, number>>, rank?: KnightRank): number {
  let share = 0;
  for (const f of Object.keys(TOWN_BLOCS) as Faction[]) {
    share += (TOWN_BLOCS[f] / 100) * clamp(0.5 + (moods[f] ?? 0) / 200, 0, 1);
  }
  if (rank === "commander") share += MAYOR_AT.commanderBonus;
  return clamp(share, 0, 1);
}

/**
 * Whether she can be Reeve: late (act 3) with a council seat, then either the Baron has fallen (the town picks its own
 * Reeve), or she wins the town vote (over half) with Respect 50. She needn't be a knight at all; Commander only helps.
 */
export function mayorEligible(state: KnightState, facts: KnightFacts): { ok: boolean; route: "baronFell" | "vote" | null; missing: string[] } {
  const missing: string[] = [];
  if (facts.act < MAYOR_AT.act) missing.push(`Act ${MAYOR_AT.act}`);
  if (!facts.councilSeat) missing.push("A council seat");
  if (missing.length === 0 && facts.baronFallen) return { ok: true, route: "baronFell", missing };
  const share = facts.townVote + (state.rank === "commander" ? MAYOR_AT.commanderBonus : 0);
  if (share <= MAYOR_AT.voteShare) missing.push(`Win the town vote (${Math.round(share * 100)}%, over ${MAYOR_AT.voteShare * 100}%) or see the Baron fall`);
  if (facts.respect < MAYOR_AT.respect) missing.push(`Respect ${MAYOR_AT.respect} (${facts.respect})`);
  return { ok: missing.length === 0, route: missing.length === 0 ? "vote" : null, missing };
}

export function becomeReeve(state: KnightState, facts: KnightFacts): { ok: boolean; state: KnightState; missing: string[] } {
  const e = mayorEligible(state, facts);
  return e.ok ? { ok: true, state: { ...state, reeve: true }, missing: [] } : { ok: false, state, missing: e.missing };
}

// ---------- The Law board ----------

export type LawId = "aleTax" | "curfew" | "dressCode" | "publicAffection" | "freeUse" | "stateFaith" | "brothels";
/** 0 is tame, 2 is wild. */
export type LawLevel = 0 | 1 | 2;
export type LawBoard = Record<LawId, LawLevel>;

export interface LawDef {
  name: string;
  levels: readonly [string, string, string];
  changes: string;
  /** Each faction's mood change per step toward wild (negative: they hate it). */
  factions: Partial<Record<Faction, number>>;
}

export const LAWS: Readonly<Record<LawId, LawDef>> = {
  aleTax: { name: "Ale tax", levels: ["High", "Fair", "None"], changes: "Her prices against the rivals, the farmers' mood.", factions: { farmers: 10, soldiers: 5, merchants: 5, nobles: -10 } },
  curfew: { name: "Curfew", levels: ["Dusk", "Midnight", "None"], changes: "How long the night's service can run.", factions: { soldiers: 5, merchants: 5, oden: -10, nobles: -5 } },
  dressCode: { name: "Dress code", levels: ["Modest", "Relaxed", "Bare is legal"], changes: "Townsfolk outfits on the street and in the taproom. Bare: nudity in public is legal.", factions: { devotees: 10, soldiers: 5, oden: -15, nobles: -10 } },
  publicAffection: { name: "Public affection", levels: ["Kept private", "Touching allowed", "Sex anywhere"], changes: "What NPCs do in the streets and the grass by day, and what guests do in the taproom. Her own consent follows the Consent switch (TOWN_DAY.md §6.3).", factions: { devotees: 15, soldiers: 10, oden: -20, nobles: -10 } },
  freeUse: { name: "Free use", levels: ["Off", "Devotees only", "Everyone"], changes: "Anyone may ask anyone in town, anywhere; the willing say yes. For her it follows the Consent switch (§6.3): never while she's passed out, and never the Baron.", factions: { devotees: 20, soldiers: 10, oden: -25, nobles: -15, farmers: -5 } },
  stateFaith: { name: "State faith", levels: ["The Stone-Hearted", "All gods", "Veyra"], changes: "Oden's chapel protected or shut; the Warm House the town's church.", factions: { devotees: 20, oden: -25, nobles: -5 } },
  brothels: { name: "Brothels", levels: ["Banned", "Licensed", "Free"], changes: "The Lantern's licence, solved by her own law.", factions: { soldiers: 5, devotees: 5, oden: -10, merchants: 5 } },
};

/** The Baron's laws, the board she inherits. */
export const BARON_LAWS: LawBoard = { aleTax: 0, curfew: 1, dressCode: 1, publicAffection: 0, freeUse: 0, stateFaith: 0, brothels: 1 };

/** What a change asks of the council and costs: support 50 +10 a step (+10 more to go fully wild), 40 gold a step (+20 wild). */
export function lawCost(from: LawLevel, to: LawLevel): { support: number; gold: number; favours: number } {
  const steps = Math.abs(to - from);
  const wild = to === 2 && from !== 2 ? 1 : 0;
  return { support: 50 + 10 * steps + 10 * wild, gold: 40 * steps + 20 * wild, favours: steps };
}

export interface PassLawResult {
  passed: boolean;
  state: KnightState;
  /** Spent only when it passes. */
  gold: number;
  favours: number;
  /** Mood changes for each faction (empty when it fails). */
  factions: Partial<Record<Faction, number>>;
  line: string;
}

/** Put a law to the council (support 0 to 100). It passes with enough support; the factions answer. */
export function passLaw(state: KnightState, law: LawId, level: LawLevel, councilSupport: number): PassLawResult {
  const def = LAWS[law];
  const fail = (line: string): PassLawResult => ({ passed: false, state, gold: 0, favours: 0, factions: {}, line });
  if (!state.reeve) return fail("Only the Reeve can put a law to the council.");
  const from = state.laws[law];
  if (from === level) return fail(`${def.name} is already "${def.levels[level]}".`);
  const cost = lawCost(from, level);
  if (councilSupport < cost.support) return fail(`The council won't pass "${def.levels[level]}" (support ${councilSupport}, needs ${cost.support}).`);
  const factions: Partial<Record<Faction, number>> = {};
  for (const [f, per] of Object.entries(def.factions) as [Faction, number][]) factions[f] = per * (level - from);
  return {
    passed: true,
    state: { ...state, laws: { ...state.laws, [law]: level } },
    gold: cost.gold,
    favours: cost.favours,
    factions,
    line: `The council passes it: ${def.name}, "${def.levels[level]}". The town will feel it by morning.`,
  };
}
