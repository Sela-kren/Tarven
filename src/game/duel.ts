/**
 * After Hours: a pleasure duel, Karryn-style, that she has agreed to. Once the tavern's shut, a guest she's warmed
 * to tonight lingers and asks for a game; she says yes or no. If yes, she sets the rules first: which parts of her
 * are in play (only ones she's warm enough for tonight) and the stake. Then it's turn by turn, like a brawl.
 *
 * There can be more than one partner, men or women, the way Karryn faces several at once. Each part of her holds
 * so many at a time (two hands, one of everything else): a partner who takes a part keeps it until they give in,
 * and each kind of guest has a part they go for first. Her moves go to one partner she picks; Tease and Undress
 * work on everyone. She wins when every partner has given in, and loses if her pleasure tops out first.
 *
 * Her side: her pleasure and her stamina (bolder moves cost more). Each partner the same. As her pleasure climbs
 * she goes from calm to aroused to on the edge: her moves hit harder, but holding back gets harder too.
 *
 * Lines that hold: they never do anything outside the rules she set, Stop always ends it at once with nothing
 * lost, and nobody plays too drunk. The moves and their lines are in duelmoves.ts.
 */
import { statsOf, type RoleStats } from "./guestroles";
import type { GuestKind } from "./tavern";
import type { Meter } from "./passives";
import type { SkillId, StatId } from "./skills";
import { HER_MOVES, HER_MOVES_ON_WOMEN, THEIR_MOVES, THEIR_MOVES_WOMEN, type HerMove } from "./duelmoves";
import { fill, SCENES, type RolePlay } from "./duellines";
import { flavor } from "./flavor";
import { CUM_LINES, loadOf, spotFor, type CumSpot } from "./cum";
import { MOANS, TALK, THEIR_STAGES } from "./dueltalk";
import { HOLD_WILL, maxWillpower, SECOND_WIND_WILL, SPENT_EDGE } from "./willpower";

export type DuelArea = "hands" | "mouth" | "breasts" | "butt" | "pussy";
export type DuelMove = "kiss" | "caress" | "tease" | "undress" | "hands" | "mouth" | "tits" | "ride" | "anal" | "hold" | "endure" | "stop";
export type DuelOutcome = "won" | "lost" | "stopped";
export type DuelState = "calm" | "aroused" | "edge";

/** Each part of her she can put in play, the meter it draws on, how warm that meter has to be tonight, and how many partners it holds at once. */
export const DUEL_AREAS: readonly { id: DuelArea; name: string; meter: Meter; need: number; holds: number }[] = [
  { id: "hands", name: "Hands", meter: "body", need: 20, holds: 2 },
  { id: "mouth", name: "Mouth", meter: "mouth", need: 30, holds: 1 },
  { id: "breasts", name: "Breasts", meter: "breasts", need: 30, holds: 1 },
  { id: "butt", name: "Butt", meter: "butt", need: 40, holds: 1 },
  { id: "pussy", name: "Pussy", meter: "pussy", need: 50, holds: 1 },
];
const HOLDS = new Map(DUEL_AREAS.map((a) => [a.id, a.holds]));
export const AREA_NAMES: Record<DuelArea, string> = Object.fromEntries(DUEL_AREAS.map((a) => [a.id, a.name])) as Record<DuelArea, string>;

export const STATE_NAMES: Record<DuelState, string> = { calm: "Calm", aroused: "Aroused", edge: "On the Edge" };

/**
 * The most partners on her at once: six, as many as her body holds (two hands, mouth, breasts, butt, pussy). More
 * can be in the game: they wait in line and step in as one gives in (the line piles up, like Karryn's Prison), so
 * it isn't over until the last of them has.
 */
export const MAX_PARTNERS = 6;
const PLEASURE_MAX = 100;
/**
 * A climax, Karryn's way: it doesn't end the game. She comes, it costs her willpower, and she comes down to here.
 * When her willpower runs out she's lost (`defeated`, a debuff for the nights after), but it plays on to the end,
 * every one of them in line, and every climax counts toward her lewdness. Stop always ends it.
 */
export const CLIMAX_WILL = 10;
export const AFTER_CLIMAX = 50;
/** Lost, she lets them have her way: a turn with no move of hers, a little stamina back. */
export const ENDURE_STAMINA = 4;
/** Once she's lost, they take what they want, and it gets them there faster. */
export const DEFEATED_THEIRS = 5;
const BASE_STAMINA = 24;
const AROUSED_AT = 50;
const EDGE_AT = 80;
/** Times she can undress: down to her shift, then nothing. */
const MAX_UNDRESS = 2;
/** What each step of undressing adds to her moves. */
const UNDRESS_BONUS = 0.15;
/** What Hold Back takes off her pleasure at Mind 1, and stamina it gives back. */
const HOLD_BACK = 8;
const HOLD_STAMINA = 4;
/** Tease takes this much off each partner's next move. */
const TEASE_SLOW = 0.4;
/** Moves that work on every partner at once take this share of their power to each. */
const SPREAD = 0.6;
/** A partner's move tires them by this much; spent, they skip a turn and get some back. */
const THEIR_COST = 3;
const THEIR_REST = 9;
/** What a partner's move adds to the meter it lands on. */
const THEIR_METER = 5;
/**
 * With several partners, each one's move on her is scaled by (partners still in) to the power of minus this: at
 * 1 the whole group pushes as hard as one partner, at 0 each pushes as hard as a partner alone. A little under 1
 * keeps a group a bit harder each turn than one partner, as well as longer to win.
 */
const GROUP_EXPONENT = 0.9;
/** Her stamina at full goes up by this share of it for each partner past the first: she paces herself for a crowd. */
const GROUP_STAMINA = 0.8;
/** When a partner gives in with others still to go: the share of her stamina she gets back, and the pleasure off hers. */
const SECOND_WIND_STAMINA = 0.6;
const SECOND_WIND_CALM = 25;
/** Of what her move gives the partner she's with, the share each of the others gets from watching. */
const WATCH_SHARE = 0.35;
/** Chance a free partner takes a part of her rather than just kissing, and that it's the part they like best. */
const TAKE_CHANCE = 0.75;
const PREFER_CHANCE = 0.6;
/** Turns a man keeps a part of her before he gets bolder with it, and how much harder each step lands. */
const STAGE_TURNS = 2;
const STAGE_POWER = [1, 1.15, 1.3];
/** After a man's move: the chance he says something, and else the chance she does. */
const TALK_CHANCE = 0.35;
const MOAN_CHANCE = 0.25;
/** When she goes first, the men this close finish too. */
const FINISH_WITH_HER = 60;

/** Her side of the duel: stat and skill levels, and what her passives add. */
export interface DuelistStats {
  level: (id: StatId | SkillId) => number;
  /** How much faster each meter fills, from her passives. */
  sens: Record<Meter, number>;
  power: number;
  resist: number;
  stamina: number;
  hold: number;
  edge: number;
  undress: number;
  /** Her willpower going in, and at the top. Left out, she starts with all a Mind like hers gives. */
  will?: number;
  maxWill?: number;
}

/** Who a partner is, before the game starts. */
export interface PartnerSetup {
  kind: GuestKind;
  female: boolean;
  /** Their own numbers, rolled from their type: how they last, how hard to push over, what they go for. */
  stats?: RoleStats;
}

export interface Partner {
  readonly id: number;
  kind: GuestKind;
  stats?: RoleStats;
  female: boolean;
  pleasure: number;
  stamina: number;
  maxStamina: number;
  /** The part of her they've taken, if any; theirs until they give in. */
  area: DuelArea | null;
  /** Given in, and out of the game. */
  done: boolean;
  /** Teased this turn: their next move is weaker. */
  teased: boolean;
  /** Turns they've kept the part of her they have: the longer, the bolder (see THEIR_STAGES). */
  held: number;
  /** The part of her they were last at, either way round: where they finish. */
  last: DuelArea | null;
}

/** A test duel's setup, from the debug panel: what's in play, who, and where everyone starts. */
export interface DuelTest {
  areas: DuelArea[];
  stake: number;
  pleasure: number;
  /** Null starts at full. */
  stamina: number | null;
  undressed: number;
  scene: RolePlay;
  partners: { kind: GuestKind; female: boolean; pleasure: number; stamina: number | null }[];
}

export interface DuelChoice {
  move: DuelMove;
  label: string;
  disabled: boolean;
}

/** One number in a log entry: who it happened to, which bar, and by how much. */
export interface DuelEffect {
  who: string;
  side: "her" | "partner";
  /** "cum" is a load, in ml, and `who` is where it landed. */
  stat: "pleasure" | "stamina" | "will" | "cum";
  amount: number;
}

/**
 * One entry in the duel's log, set out the way Karryn's battle log is: who acted, what they did and to whom, the
 * words of it, then what it did to everyone's bars. Notes (the opening, a second wind, the end) have no actor.
 */
export interface DuelLogEntry {
  side: "her" | "partner" | "note";
  actor?: string;
  action?: string;
  target?: string;
  text: string;
  effects: DuelEffect[];
  /** For the comic panel: the part of her a partner's move was on (and how bold), her own move, or where a load landed. */
  part?: "kiss" | DuelArea;
  stage?: number;
  move?: HerMove;
  spot?: CumSpot;
  kind?: GuestKind;
}

/** What a partner's move is called in the log, by the part of her they have (or a kiss). */
const THEIR_ACTIONS: Record<"kiss" | DuelArea, string> = {
  kiss: "Kiss",
  hands: "Wandering hands",
  mouth: "Deep kiss",
  breasts: "Breast play",
  butt: "Butt grab",
  pussy: "Between your thighs",
};

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

export class Duel {
  /** Her stamina at full: more with more partners (see GROUP_STAMINA). */
  maxStamina: number;
  stamina: number;
  /** Her stamina at full against one partner. */
  private readonly soloStamina: number;
  pleasure = 0;
  /** Her willpower: holding back spends it. With too little left she can't hold back, only Stop. */
  will: number;
  readonly maxWill: number;
  readonly partners: Partner[] = [];
  /** In the game but waiting their turn: they step in, in order, as those on her give in. */
  readonly waiting: PartnerSetup[] = [];
  /** What's in play; the test panel can change it mid-game. */
  readonly areas: Set<DuelArea>;
  outcome: DuelOutcome | null = null;
  /** The log, entry by entry; `log` has the same as plain lines. */
  readonly entries: DuelLogEntry[] = [];
  /** The role-play they agreed on; its lines colour the log. */
  readonly scene: RolePlay;
  private lastLine = "";
  /** Experience earned, for the tavern to hand out at the end. */
  readonly xp: Partial<Record<StatId | SkillId, number>> = {};
  /** What she's done, for the records. */
  readonly used: Partial<Record<DuelMove, number>> = {};
  /** How much each meter went up, for the tavern to add to tonight's. */
  readonly meterGains: Partial<Record<Meter, number>> = {};
  undressed = 0;
  heldBack = 0;
  /** Her willpower gave out: she's lost, and it plays on to the end anyway (Stop still ends it). */
  defeated = false;
  /** Times she came in this game. */
  climaxes = 0;
  /** Whether she won on the edge. */
  wonOnEdge = false;
  /** Every load, in ml, by where it landed; and how many there were. */
  readonly cum: Partial<Record<CumSpot, number>> = {};
  loads = 0;
  private nextId = 1;

  constructor(
    kind: GuestKind,
    areas: ReadonlySet<DuelArea>,
    readonly stake: number,
    private readonly stats: DuelistStats,
    private readonly random: () => number,
    partners: readonly PartnerSetup[] = [{ kind, female: false }],
    scene: RolePlay = "plain",
  ) {
    this.areas = new Set(areas);
    this.scene = scene;
    this.soloStamina = this.maxStamina = this.stamina = BASE_STAMINA + (stats.level("endurance") - 1) * 3 + stats.stamina;
    this.maxWill = stats.maxWill ?? maxWillpower(stats.level("mind"));
    this.will = Math.max(0, Math.min(this.maxWill, stats.will ?? this.maxWill));
    for (const setup of partners) this.join(setup);
    const all = this.everyone;
    const who = all === 1 ? `The ${this.partners[0].kind} grins.` : `${all} of them gather round.${this.waiting.length > 0 ? ` ${this.waiting.length} wait their turn.` : ""}`;
    // No stake (the taproom game): nobody pays, so nobody says so.
    this.note(`${who} "${stake > 0 ? `Loser pays ${stake} gold. ` : ""}Say stop whenever you like."`);
    const lines = this.lines();
    if (lines) this.note(this.pick(lines.opening, ""));
  }

  /** The log as plain lines, numbers and all. */
  get log(): string[] {
    return this.entries.map((e) => {
      const head = e.actor ? `${e.actor}${e.action ? ` · ${e.action}` : ""}${e.target ? ` → ${e.target}` : ""}: ` : "";
      const nums = e.effects.map((f) => `${f.who} ${f.amount > 0 ? "+" : ""}${f.amount} ${f.stat}`).join(", ");
      return `${head}${e.text}${nums ? ` (${nums})` : ""}`;
    });
  }

  /** A line in the log with nobody acting: the opening, a second wind, the end. */
  note(text: string, effects: DuelEffect[] = []): void {
    if (text) this.entries.push({ side: "note", text, effects });
  }

  /** The role-play's lines, or null for a plain game. */
  private lines() {
    return this.scene === "plain" ? null : SCENES[this.scene];
  }

  /** One of a set of lines, not the same as the last one shown if there's a choice; the fallback if there are none. */
  /**
   * An AI-written line for this moment in place of the written one, when there is one: only in a plain game and
   * with a man, which is what the line bank is written for. Role-play scenes and women keep their own lines.
   */
  private flavorOr(key: string, partner: Partner, written: string): string {
    if (this.scene !== "plain" || partner.female) return written;
    return flavor(key, partner.kind) ?? written;
  }

  private pick(lines: readonly string[] | undefined, fallback: string): string {
    if (!lines || lines.length === 0) return fill(fallback);
    const options = lines.length > 1 ? lines.filter((l) => l !== this.lastLine) : lines;
    const line = options[Math.floor(this.random() * options.length) % options.length];
    this.lastLine = line;
    return fill(line);
  }

  /** Someone joins the game: on her at once if there's room, or else at the end of the line. */
  join(setup: PartnerSetup): Partner | null {
    if (this.active.length < MAX_PARTNERS) return this.addPartner(setup);
    this.waiting.push(setup);
    return null;
  }

  /** Everyone in it: done, on her, or waiting. */
  get everyone(): number {
    return this.partners.length + this.waiting.length;
  }

  /** Someone else joins the game (the test panel adds them mid-game). */
  addPartner(setup: PartnerSetup): Partner | null {
    if (this.active.length >= MAX_PARTNERS) return null;
    const max = (setup.stats ?? statsOf(setup.kind)).partner.stamina;
    const partner: Partner = { id: this.nextId++, ...setup, pleasure: 0, stamina: max, maxStamina: max, area: null, done: false, teased: false, held: 0, last: null };
    this.partners.push(partner);
    this.fitStamina();
    return partner;
  }

  removePartner(id: number): void {
    const index = this.partners.findIndex((p) => p.id === id);
    if (index >= 0 && this.partners.length > 1) this.partners.splice(index, 1);
    this.fitStamina();
  }

  /** Her full stamina for how many partners there are; what she has now moves with it. */
  private fitStamina(): void {
    const max = Math.round(this.soloStamina * (1 + GROUP_STAMINA * (this.partners.length - 1)));
    this.stamina = Math.max(0, Math.min(max, this.stamina + max - this.maxStamina));
    this.maxStamina = max;
  }

  /** The first partner: the one who asked. */
  get kind(): GuestKind {
    return this.partners[0].kind;
  }
  get theirPleasure(): number {
    return this.partners[0].pleasure;
  }
  set theirPleasure(n: number) {
    this.partners[0].pleasure = n;
  }
  get theirStamina(): number {
    return this.partners[0].stamina;
  }
  set theirStamina(n: number) {
    this.partners[0].stamina = n;
  }
  get theirMax(): number {
    return this.partners[0].maxStamina;
  }

  /** Partners still in the game. */
  get active(): Partner[] {
    return this.partners.filter((p) => !p.done);
  }

  /** What a partner is called: their type (or kind), numbered when there's more than one called that. */
  nameOf(partner: Partner): string {
    const called = (p: Partner) => p.stats?.label ?? capital(p.kind);
    const same = this.partners.filter((p) => called(p) === called(partner));
    return called(partner) + (same.length > 1 ? ` ${same.indexOf(partner) + 1}` : "");
  }

  get state(): DuelState {
    return this.pleasure >= EDGE_AT ? "edge" : this.pleasure >= AROUSED_AT ? "aroused" : "calm";
  }

  /** How much harder her moves land, by how she's feeling. */
  private stateBoost(): number {
    const s = this.state;
    return s === "edge" ? 1.5 + this.stats.edge : s === "aroused" ? 1.25 : 1;
  }

  /** Her move as it is against this partner: a woman gets her own moves, or none for some. */
  moveFor(move: HerMove, partner: Partner): { label: string; line: string; area: DuelArea | null } | null {
    const def = HER_MOVES[move];
    if (!partner.female) return def;
    const her = HER_MOVES_ON_WOMEN[move];
    return her ? { label: her.label, line: her.line, area: her.area === undefined ? def.area : her.area } : null;
  }

  /** Pleasure a move of hers gives a partner (the first still in, if none is named). */
  power(move: HerMove, partner: Partner | undefined = this.active[0] ?? this.partners[0]): number {
    const def = HER_MOVES[move];
    const skill = 1 + (this.stats.level(def.skill) - 1) * 0.1;
    const charm = move === "tease" ? (this.stats.level("charm") - 1) * 1.5 : 0;
    const bare = 1 + this.undressed * (UNDRESS_BONUS + this.stats.undress);
    const spread = this.spreads(move) && this.active.length > 1 ? SPREAD : 1;
    return Math.round((def.power + charm) * skill * bare * this.stateBoost() * (1 + this.stats.power) * (partner.stats ?? statsOf(partner.kind)).partner.resist * spread);
  }

  /** Moves that work on everyone at once, like Karryn's Flaunt. */
  private spreads(move: DuelMove): boolean {
    return move === "tease" || move === "undress";
  }

  /** What Hold Back would take off her pleasure now: less the closer she is. */
  holdAmount(): number {
    const s = this.state;
    const factor = s === "edge" ? 0.4 : s === "aroused" ? 0.6 : 1;
    return Math.max(1, Math.round((HOLD_BACK + (this.stats.level("mind") - 1) * 2) * factor * Math.max(0.1, 1 + this.stats.hold)));
  }

  /** What Hold Back costs in willpower now: more the more worked up she is. */
  holdCost(): number {
    return HOLD_WILL[this.state];
  }

  /** How many partners hold a part of her, leaving one partner out of the count. */
  private holding(area: DuelArea, except?: Partner): number {
    return this.active.filter((p) => p.area === area && p !== except).length;
  }

  /** Whether a part of her has room for this partner. */
  private room(area: DuelArea, partner: Partner): boolean {
    return partner.area === area || this.holding(area, partner) < (HOLDS.get(area) ?? 1);
  }

  /** Her moves now, on a partner (the first still in, if none is named). Stop is always there, and always works. */
  choices(target?: number): DuelChoice[] {
    const partner = this.target(target);
    const out: DuelChoice[] = [];
    for (const move of Object.keys(HER_MOVES) as HerMove[]) {
      const cost = HER_MOVES[move].cost;
      if (move === "undress") {
        if (this.undressed >= MAX_UNDRESS) continue;
        out.push({ move, label: this.undressed === 0 ? "Undress down to your shift" : "Undress completely", disabled: false });
        continue;
      }
      const def = partner ? this.moveFor(move, partner) : HER_MOVES[move];
      if (!def || (def.area && !this.areas.has(def.area))) continue;
      const tired = this.stamina < cost;
      const busy = Boolean(partner && def.area && !this.room(def.area, partner));
      const everyone = this.spreads(move) && this.active.length > 1 ? " · everyone" : "";
      const why = tired ? " (too tired)" : busy ? " (taken)" : "";
      out.push({ move, label: `${def.label} · +${this.power(move, partner)}${everyone} · ${cost} stamina${why}`, disabled: tired || busy });
    }
    // Lost, or too tired for anything else: she can let them, and get a little breath back.
    if (this.defeated || out.every((c) => c.disabled)) {
      out.push({ move: "endure", label: `Let them · +${ENDURE_STAMINA} stamina`, disabled: false });
    }
    const cost = this.holdCost();
    const spent = this.will < cost;
    out.push({
      move: "hold",
      label: `Hold back (Mind) · -${this.holdAmount()} to you · ${cost} will${spent ? " (no willpower left)" : ""}`,
      disabled: spent,
    });
    out.push({ move: "stop", label: "Stop", disabled: false });
    return out;
  }

  /** The partner a move goes to: the one named if they're still in, otherwise the first who is. */
  target(id?: number): Partner | undefined {
    const active = this.active;
    return active.find((p) => p.id === id) ?? active[0];
  }

  private gain(id: StatId | SkillId, n: number): void {
    this.xp[id] = (this.xp[id] ?? 0) + n;
  }

  /** She makes her move on a partner (the first still in, if none is named); then everyone still in makes theirs. */
  act(move: DuelMove, target?: number): void {
    if (this.outcome) return;
    if (move === "stop") {
      this.used.stop = (this.used.stop ?? 0) + 1;
      this.entries.push({ side: "her", actor: "You", action: "Stop", text: "You call it off. They nod, and step back.", effects: [] });
      this.outcome = "stopped";
      return;
    }
    if (move === "hold") {
      const cost = this.holdCost();
      if (this.will < cost) return;
      this.will -= cost;
      this.used.hold = (this.used.hold ?? 0) + 1;
      const n = this.holdAmount();
      this.pleasure = Math.max(0, this.pleasure - n);
      this.stamina = Math.min(this.maxStamina, this.stamina + HOLD_STAMINA);
      this.heldBack++;
      this.gain("mind", 2);
      this.entries.push({
        side: "her",
        actor: "You",
        action: "Hold back",
        text: "You slow down and catch your breath.",
        effects: [
          { who: "You", side: "her", stat: "pleasure", amount: -n },
          { who: "You", side: "her", stat: "stamina", amount: HOLD_STAMINA },
          { who: "You", side: "her", stat: "will", amount: -cost },
        ],
      });
    } else if (move === "endure") {
      this.used.endure = (this.used.endure ?? 0) + 1;
      this.stamina = Math.min(this.maxStamina, this.stamina + ENDURE_STAMINA);
      this.gain("endurance", 1);
      this.entries.push({
        side: "her",
        actor: "You",
        action: "Let them",
        text: this.defeated ? "You've nothing left to fight it with. You let them." : "You lie back and let them, catching your breath.",
        effects: [{ who: "You", side: "her", stat: "stamina", amount: ENDURE_STAMINA }],
      });
    } else if (!this.herMove(move, target)) return;
    if (this.settle()) return;
    for (const partner of this.active) {
      this.theirTurn(partner);
      if (this.settle()) return;
    }
  }

  /** Her move itself. False if it can't be made, and then nothing happens. */
  private herMove(move: HerMove, target?: number): boolean {
    const base = HER_MOVES[move];
    if (move === "undress") {
      if (this.undressed >= MAX_UNDRESS) return false;
    } else if (this.stamina < base.cost) return false;
    const partner = this.target(target);
    if (!partner) return false;
    this.used[move] = (this.used[move] ?? 0) + 1;
    this.stamina -= base.cost;
    this.pleasure = Math.min(PLEASURE_MAX, this.pleasure + base.self);
    this.gain(base.skill, move === "kiss" || move === "caress" || move === "tease" ? 1 : 3);

    // Her own side of it: what it cost her, and what it did to her.
    const mine: DuelEffect[] = [];
    if (base.self > 0) mine.push({ who: "You", side: "her", stat: "pleasure", amount: base.self });
    if (base.cost > 0) mine.push({ who: "You", side: "her", stat: "stamina", amount: -base.cost });

    if (this.spreads(move)) {
      const effects: DuelEffect[] = [];
      for (const p of this.active) {
        const n = this.power(move, p);
        p.pleasure = Math.min(PLEASURE_MAX, p.pleasure + n);
        if (move === "tease") p.teased = true;
        effects.push({ who: this.nameOf(p), side: "partner", stat: "pleasure", amount: n });
      }
      const group = this.active.length > 1;
      let text: string;
      let action = HER_MOVES[move].label;
      if (move === "undress") {
        this.undressed++;
        action = this.undressed === 1 ? "Undress" : "Undress completely";
        const stare = group ? "They all stare." : "They stare.";
        text = this.undressed === 1 ? `You let your dress fall, slowly. ${stare}` : "You slip out of the rest.";
      } else {
        // On a group it's said to all of them; on one partner, in their own words.
        const lines = this.lines();
        text = this.pick(lines && !group ? (partner.female ? lines.herOnWoman : lines.her)[move] : lines?.her[move], group ? base.line : (this.moveFor(move, partner) ?? base).line);
      }
      text = this.flavorOr(`duel:her:${move}:${this.state}`, partner, text);
      this.entries.push({ side: "her", actor: "You", action, target: group ? "Everyone" : this.nameOf(partner), text, effects: [...effects, ...mine], move, kind: partner.kind });
      return true;
    }

    const def = this.moveFor(move, partner);
    if (!def) return false;
    if (def.area) {
      if (!this.areas.has(def.area) || !this.room(def.area, partner)) return false;
      // She takes them to that part of her; it's theirs until they give in.
      if (partner.area !== def.area) partner.held = 0;
      partner.area = def.area;
      partner.last = def.area;
    }
    const n = this.power(move, partner);
    partner.pleasure = Math.min(PLEASURE_MAX, partner.pleasure + n);
    // The others watch, and it works on them too, the way Karryn's enemies get worked up watching.
    const watched = Math.round(n * WATCH_SHARE);
    const watching = this.active.filter((p) => p !== partner);
    for (const p of watching) p.pleasure = Math.min(PLEASURE_MAX, p.pleasure + watched);
    const lines = this.lines();
    const effects: DuelEffect[] = [{ who: this.nameOf(partner), side: "partner", stat: "pleasure", amount: n }];
    if (watching.length > 0 && watched > 0) effects.push({ who: watching.length > 1 ? "Others watching" : this.nameOf(watching[0]), side: "partner", stat: "pleasure", amount: watched });
    this.entries.push({
      side: "her",
      actor: "You",
      action: def.label,
      target: this.nameOf(partner),
      text: this.flavorOr(`duel:her:${move}:${this.state}`, partner, this.pick(lines ? (partner.female ? lines.herOnWoman : lines.her)[move] : undefined, def.line)),
      effects: [...effects, ...mine],
      move,
      kind: partner.kind,
    });
    return true;
  }

  /** Anyone who's given in drops out; then whether it's over, either way. */
  private settle(): boolean {
    for (const p of this.active) {
      if (p.pleasure < PLEASURE_MAX) continue;
      p.done = true;
      const lines = this.lines();
      this.entries.push({
        side: "partner",
        actor: this.nameOf(p),
        action: "Gives in",
        text: this.flavorOr(
          "duel:givesin",
          p,
          this.pick(lines ? (p.female ? lines.givesInWoman : lines.givesIn) : undefined, p.female ? "She gives in with a shudder." : "They give in, with a groan."),
        ),
        effects: [],
      });
      this.finish(p);
      p.area = null;
      // With more of them still to go, seeing one give in is a second wind, like Karryn's energy coming back.
      if (this.active.length > 0 || this.waiting.length > 0) {
        const stamina = Math.round(this.maxStamina * SECOND_WIND_STAMINA);
        this.stamina = Math.min(this.maxStamina, this.stamina + stamina);
        this.pleasure = Math.max(0, this.pleasure - SECOND_WIND_CALM);
        const will = Math.min(this.maxWill - this.will, SECOND_WIND_WILL);
        this.will += will;
        this.note("Seeing one of them give in, you get a second wind.", [
          { who: "You", side: "her", stat: "stamina", amount: stamina },
          { who: "You", side: "her", stat: "pleasure", amount: -SECOND_WIND_CALM },
          ...(will > 0 ? [{ who: "You", side: "her" as const, stat: "will" as const, amount: will }] : []),
        ]);
      }
    }
    // The next in line steps into the space they left.
    while (this.waiting.length > 0 && this.active.length < MAX_PARTNERS) {
      const next = this.addPartner(this.waiting.shift()!);
      if (next) this.note(`The ${this.nameOf(next).toLowerCase()} steps in to take a turn.${this.waiting.length > 0 ? ` ${this.waiting.length} still waiting.` : ""}`);
    }
    if (this.active.length === 0) {
      if (this.defeated) {
        this.note(this.partners.length > 1 ? "The last of them is done with you. It's over." : "They're done with you. It's over.");
        this.outcome = "lost";
        return true;
      }
      this.wonOnEdge = this.state === "edge";
      this.note(this.pick(this.lines()?.win, this.partners.length > 1 ? "The last of them gives in. You win." : "They give in first. You win."));
      this.outcome = "won";
      return true;
    }
    if (this.pleasure >= PLEASURE_MAX) this.climax();
    // Her willpower's gone: she's lost. It plays on to the end all the same.
    if (!this.defeated && this.will <= 0) {
      this.defeated = true;
      this.note(this.pick(this.lines()?.lose, "Your willpower gives out. You've lost, and they know it. They aren't done yet. (Stop still ends it.)"));
    }
    return false;
  }

  /**
   * She comes. The game goes on: it costs her willpower, she comes down to AFTER_CLIMAX, and the ones who were
   * close go over with her.
   */
  private climax(): void {
    this.climaxes++;
    const will = Math.min(this.will, CLIMAX_WILL);
    this.will -= will;
    const drop = this.pleasure - AFTER_CLIMAX;
    this.pleasure = AFTER_CLIMAX;
    this.note(this.climaxes === 1 ? "It's too much. You come, hard." : "You come again.", [
      { who: "You", side: "her", stat: "pleasure", amount: -drop },
      ...(will > 0 ? [{ who: "You", side: "her" as const, stat: "will" as const, amount: -will }] : []),
    ]);
    // Feeling her come undone, the men who were close go over with her.
    for (const p of this.active) if (p.pleasure >= FINISH_WITH_HER) p.pleasure = PLEASURE_MAX;
  }

  /** A partner's turn: work the part of her they've taken, or take one (the part they like, if it's free), or kiss her. */
  private theirTurn(partner: Partner): void {
    if (partner.stamina < THEIR_COST) {
      partner.stamina = Math.min(partner.maxStamina, partner.stamina + THEIR_REST);
      this.entries.push({
        side: "partner",
        actor: this.nameOf(partner),
        action: "Rest",
        text: partner.female ? "She has to stop and catch her breath." : "They have to stop and catch their breath.",
        effects: [{ who: this.nameOf(partner), side: "partner", stat: "stamina", amount: THEIR_REST }],
      });
      return;
    }
    partner.stamina -= THEIR_COST;
    // Never outside her rules: a part taken out of play is let go of.
    if (partner.area && !this.areas.has(partner.area)) partner.area = null;
    if (!partner.area && this.random() < TAKE_CHANCE) {
      const free = [...this.areas].filter((a) => this.room(a, partner));
      const liked = (partner.stats ?? statsOf(partner.kind)).prefers;
      if (free.length > 0) {
        partner.area = free.includes(liked) && this.random() < PREFER_CHANCE ? liked : free[Math.floor(this.random() * free.length) % free.length];
        partner.held = 0;
      }
    }
    const pick = partner.area ?? "kiss";
    const def = (partner.female ? THEIR_MOVES_WOMEN : THEIR_MOVES)[pick];
    // A man grows bolder with the part of her he's kept: from hands to fucking, a step every few turns.
    const stage = partner.area && !partner.female ? Math.min(2, Math.floor(partner.held / STAGE_TURNS)) : 0;
    const bolder = partner.area && !partner.female ? THEIR_STAGES[partner.area][stage] : null;
    if (partner.area) {
      partner.held++;
      partner.last = partner.area;
    }
    const slowed = partner.teased ? 1 - TEASE_SLOW : 1;
    partner.teased = false;
    const group = Math.pow(this.active.length, -GROUP_EXPONENT);
    // On the edge with no willpower left to hold it back with, it all lands that bit harder.
    const spent = this.will <= 0 && this.state === "edge" ? 1 + SPENT_EDGE : 1;
    const n = Math.max(
      1,
      Math.round(
        def.power * (partner.stats ?? statsOf(partner.kind)).partner.skill * (1 + this.stats.sens[def.meter]) * Math.max(0.2, 1 - this.stats.resist) * slowed * group * STAGE_POWER[stage] * spent,
      ),
    );
    this.pleasure = Math.min(PLEASURE_MAX, this.pleasure + n);
    const theirs = this.defeated ? DEFEATED_THEIRS : 2;
    partner.pleasure = Math.min(PLEASURE_MAX, partner.pleasure + theirs);
    this.meterGains[def.meter] = (this.meterGains[def.meter] ?? 0) + THEIR_METER;
    this.gain("endurance", 1);
    const lines = this.lines();
    this.entries.push({
      side: "partner",
      actor: this.nameOf(partner),
      action: bolder?.action ?? THEIR_ACTIONS[pick],
      target: "You",
      text: this.flavorOr(
        partner.area ? `duel:their:${pick}:${stage}` : `duel:their:kiss:${this.state}`,
        partner,
        this.pick(lines ? (partner.female ? lines.her2 : lines.him)[pick] : undefined, bolder?.line ?? def.line),
      ),
      effects: [
        { who: "You", side: "her", stat: "pleasure", amount: n },
        { who: this.nameOf(partner), side: "partner", stat: "pleasure", amount: theirs },
        { who: this.nameOf(partner), side: "partner", stat: "stamina", amount: -THEIR_COST },
      ],
      part: pick,
      stage,
      kind: partner.kind,
    });
    this.talk(partner, pick);
  }

  /**
   * Now and then, after a man's move, he says something filthy, or she can't help answering. Only in a plain
   * game: a role-play has its own voice.
   */
  private talk(partner: Partner, pick: "kiss" | DuelArea): void {
    if (this.scene !== "plain" || partner.female) return;
    const roll = this.random();
    if (roll < TALK_CHANCE) {
      const said = flavor(`duel:talk:${pick}`, partner.kind) ?? this.pick(TALK[pick], "");
      this.entries.push({ side: "partner", actor: this.nameOf(partner), action: "Says", text: said, effects: [] });
    } else if (roll < TALK_CHANCE + MOAN_CHANCE) {
      const said = flavor(`duel:moan:${this.state}`, partner.kind) ?? this.pick(MOANS[this.state], "");
      this.entries.push({ side: "her", actor: "You", action: "Moan", text: said, effects: [] });
    }
  }

  /** A man finishes: where it lands (only ever a part of her in play), how much, and the log line for it. */
  private finish(partner: Partner): void {
    if (partner.female) return;
    const spot = spotFor(partner.last ?? partner.area, this.areas.has("mouth"), this.random);
    const ml = loadOf(partner.kind, this.random, partner.stats);
    this.cum[spot] = (this.cum[spot] ?? 0) + ml;
    this.loads++;
    const who = this.nameOf(partner);
    const written = this.pick(CUM_LINES[spot], "{who} finishes on you.").replace("{who}", `The ${who.toLowerCase()}`);
    const ai = this.scene === "plain" ? flavor(`duel:cum:${spot}`, partner.kind) : null;
    this.entries.push({
      side: "partner",
      actor: who,
      action: "Cums",
      target: "You",
      text: ai ?? written,
      effects: [{ who: CUM_SPOT_LOG[spot], side: "her", stat: "cum", amount: ml }],
      spot,
      kind: partner.kind,
    });
  }
}

/** Where a load landed, as the log's number chip says it. */
const CUM_SPOT_LOG: Record<CumSpot, string> = {
  mouth: "In your mouth",
  face: "On your face",
  breasts: "On your tits",
  pussy: "In your pussy",
  ass: "In your ass",
  body: "On your body",
};
