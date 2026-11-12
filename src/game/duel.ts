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
import type { GuestKind } from "./tavern";
import type { Meter } from "./passives";
import type { SkillId, StatId } from "./skills";
import { HER_MOVES, HER_MOVES_ON_WOMEN, PARTNERS, PREFERS, THEIR_MOVES, THEIR_MOVES_WOMEN, type HerMove } from "./duelmoves";
import { fill, SCENES, type RolePlay } from "./duellines";

export type DuelArea = "hands" | "mouth" | "breasts" | "butt" | "pussy";
export type DuelMove = "kiss" | "caress" | "tease" | "undress" | "hands" | "mouth" | "tits" | "ride" | "anal" | "hold" | "stop";
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

/** The most partners at once. */
export const MAX_PARTNERS = 4;
const PLEASURE_MAX = 100;
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
}

/** Who a partner is, before the game starts. */
export interface PartnerSetup {
  kind: GuestKind;
  female: boolean;
}

export interface Partner {
  readonly id: number;
  kind: GuestKind;
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
  stat: "pleasure" | "stamina";
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
  readonly partners: Partner[] = [];
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
  /** Whether she won on the edge. */
  wonOnEdge = false;
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
    for (const setup of partners.slice(0, MAX_PARTNERS)) this.addPartner(setup);
    const who = this.partners.length === 1 ? `The ${this.partners[0].kind} grins.` : `${this.partners.length} of them gather round.`;
    this.note(`${who} "Loser pays ${stake} gold. Say stop whenever you like."`);
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
  private pick(lines: readonly string[] | undefined, fallback: string): string {
    if (!lines || lines.length === 0) return fill(fallback);
    const options = lines.length > 1 ? lines.filter((l) => l !== this.lastLine) : lines;
    const line = options[Math.floor(this.random() * options.length) % options.length];
    this.lastLine = line;
    return fill(line);
  }

  /** Someone else joins the game (the test panel adds them mid-game). */
  addPartner(setup: PartnerSetup): Partner | null {
    if (this.partners.length >= MAX_PARTNERS) return null;
    const max = PARTNERS[setup.kind].stamina;
    const partner: Partner = { id: this.nextId++, ...setup, pleasure: 0, stamina: max, maxStamina: max, area: null, done: false, teased: false };
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

  /** What a partner is called: their kind, numbered when there's more than one of that kind. */
  nameOf(partner: Partner): string {
    const same = this.partners.filter((p) => p.kind === partner.kind);
    return capital(partner.kind) + (same.length > 1 ? ` ${same.indexOf(partner) + 1}` : "");
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
    return Math.round((def.power + charm) * skill * bare * this.stateBoost() * (1 + this.stats.power) * PARTNERS[partner.kind].resist * spread);
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
    out.push({ move: "hold", label: `Hold back (Mind) · -${this.holdAmount()} to you`, disabled: false });
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
        ],
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
      this.entries.push({ side: "her", actor: "You", action, target: group ? "Everyone" : this.nameOf(partner), text, effects: [...effects, ...mine] });
      return true;
    }

    const def = this.moveFor(move, partner);
    if (!def) return false;
    if (def.area) {
      if (!this.areas.has(def.area) || !this.room(def.area, partner)) return false;
      // She takes them to that part of her; it's theirs until they give in.
      partner.area = def.area;
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
      text: this.pick(lines ? (partner.female ? lines.herOnWoman : lines.her)[move] : undefined, def.line),
      effects: [...effects, ...mine],
    });
    return true;
  }

  /** Anyone who's given in drops out; then whether it's over, either way. */
  private settle(): boolean {
    for (const p of this.active) {
      if (p.pleasure < PLEASURE_MAX) continue;
      p.done = true;
      p.area = null;
      const lines = this.lines();
      this.entries.push({
        side: "partner",
        actor: this.nameOf(p),
        action: "Gives in",
        text: this.pick(lines ? (p.female ? lines.givesInWoman : lines.givesIn) : undefined, p.female ? "She gives in with a shudder." : "They give in, with a groan."),
        effects: [],
      });
      // With more of them still to go, seeing one give in is a second wind, like Karryn's energy coming back.
      if (this.active.length > 0) {
        const stamina = Math.round(this.maxStamina * SECOND_WIND_STAMINA);
        this.stamina = Math.min(this.maxStamina, this.stamina + stamina);
        this.pleasure = Math.max(0, this.pleasure - SECOND_WIND_CALM);
        this.note("Seeing one of them give in, you get a second wind.", [
          { who: "You", side: "her", stat: "stamina", amount: stamina },
          { who: "You", side: "her", stat: "pleasure", amount: -SECOND_WIND_CALM },
        ]);
      }
    }
    if (this.active.length === 0) {
      this.wonOnEdge = this.state === "edge";
      this.note(this.pick(this.lines()?.win, this.partners.length > 1 ? "The last of them gives in. You win." : "They give in first. You win."));
      this.outcome = "won";
      return true;
    }
    if (this.pleasure >= PLEASURE_MAX) {
      this.note(this.pick(this.lines()?.lose, "It's too much. You go first."));
      this.outcome = "lost";
      return true;
    }
    return false;
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
      const liked = PREFERS[partner.kind];
      if (free.length > 0) {
        partner.area = free.includes(liked) && this.random() < PREFER_CHANCE ? liked : free[Math.floor(this.random() * free.length) % free.length];
      }
    }
    const pick = partner.area ?? "kiss";
    const def = (partner.female ? THEIR_MOVES_WOMEN : THEIR_MOVES)[pick];
    const slowed = partner.teased ? 1 - TEASE_SLOW : 1;
    partner.teased = false;
    const group = Math.pow(this.active.length, -GROUP_EXPONENT);
    const n = Math.max(
      1,
      Math.round(def.power * PARTNERS[partner.kind].skill * (1 + this.stats.sens[def.meter]) * Math.max(0.2, 1 - this.stats.resist) * slowed * group),
    );
    this.pleasure = Math.min(PLEASURE_MAX, this.pleasure + n);
    partner.pleasure = Math.min(PLEASURE_MAX, partner.pleasure + 2);
    this.meterGains[def.meter] = (this.meterGains[def.meter] ?? 0) + THEIR_METER;
    this.gain("endurance", 1);
    const lines = this.lines();
    this.entries.push({
      side: "partner",
      actor: this.nameOf(partner),
      action: THEIR_ACTIONS[pick],
      target: "You",
      text: this.pick(lines ? (partner.female ? lines.her2 : lines.him)[pick] : undefined, def.line),
      effects: [
        { who: "You", side: "her", stat: "pleasure", amount: n },
        { who: this.nameOf(partner), side: "partner", stat: "pleasure", amount: 2 },
        { who: this.nameOf(partner), side: "partner", stat: "stamina", amount: -THEIR_COST },
      ],
    });
  }
}
