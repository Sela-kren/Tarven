/**
 * After Hours: a pleasure duel, Karryn-style, that she has agreed to. Once the tavern's shut, a guest she's warmed
 * to tonight lingers and asks for a game; she says yes or no. If yes, she sets the rules first: which parts of her
 * are in play (only ones she's warm enough for tonight) and the stake. Then it's turn by turn, like a brawl: her
 * moves against theirs, each side trying to make the other give in first.
 *
 * Her side: her pleasure (at the top, she's overwhelmed and loses) and her stamina (bolder moves cost more).
 * Their side the same. As her pleasure climbs she goes from calm to aroused to on the edge: her moves hit harder,
 * but holding back gets harder too.
 *
 * Lines that hold: they never do anything outside the rules she set, Stop always ends it at once with nothing
 * lost, and nobody plays too drunk. Every line here is short and never graphic; the 18+ card shows the rest.
 */
import type { GuestKind } from "./tavern";
import type { Meter } from "./passives";
import type { SkillId, StatId } from "./skills";

export type DuelArea = "hands" | "mouth" | "breasts" | "butt" | "pussy";
export type DuelMove = "kiss" | "caress" | "tease" | "undress" | "hands" | "mouth" | "ride" | "hold" | "stop";
export type DuelOutcome = "won" | "lost" | "stopped";
export type DuelState = "calm" | "aroused" | "edge";

/** Each part of her she can put in play, the meter it draws on, and how warm that meter has to be tonight. */
export const DUEL_AREAS: readonly { id: DuelArea; name: string; meter: Meter; need: number }[] = [
  { id: "hands", name: "Hands", meter: "body", need: 20 },
  { id: "mouth", name: "Mouth", meter: "mouth", need: 30 },
  { id: "breasts", name: "Breasts", meter: "breasts", need: 30 },
  { id: "butt", name: "Butt", meter: "butt", need: 40 },
  { id: "pussy", name: "Pussy", meter: "pussy", need: 50 },
];

export const STATE_NAMES: Record<DuelState, string> = { calm: "Calm", aroused: "Aroused", edge: "On the Edge" };

/**
 * Her moves: stamina cost, how much pleasure it gives them, how much it gives her, the part of her it needs in
 * play (null: always), and the skill it trains.
 */
const MOVES: Record<
  Exclude<DuelMove, "hold" | "stop">,
  { label: string; cost: number; power: number; self: number; area: DuelArea | null; skill: SkillId | StatId; line: string }
> = {
  kiss: { label: "Kiss them", cost: 2, power: 6, self: 2, area: null, skill: "upKiss", line: "You kiss them, slow and deep." },
  caress: { label: "Caress them", cost: 3, power: 8, self: 2, area: null, skill: "hands", line: "You run your hands over them." },
  tease: { label: "Tease (Charm)", cost: 2, power: 4, self: 0, area: null, skill: "charm", line: "You lean close and whisper. They lose their rhythm." },
  undress: { label: "Undress", cost: 0, power: 4, self: 1, area: null, skill: "exhibition", line: "" },
  hands: { label: "Use your hands", cost: 4, power: 12, self: 3, area: "hands", skill: "upHands", line: "You take them in hand." },
  mouth: { label: "Use your mouth", cost: 5, power: 16, self: 4, area: "mouth", skill: "upMouth", line: "You sink down and use your mouth." },
  ride: { label: "Ride them", cost: 7, power: 22, self: 10, area: "pussy", skill: "upBed", line: "You climb into their lap and ride them." },
};

/** What each kind of guest brings: how hard they are to win over, how good they are, and their stamina. */
const PARTNERS: Record<GuestKind, { resist: number; skill: number; stamina: number }> = {
  farmer: { resist: 1.1, skill: 0.9, stamina: 20 },
  fugitive: { resist: 1, skill: 1, stamina: 22 },
  smuggler: { resist: 0.9, skill: 1.1, stamina: 22 },
  soldier: { resist: 0.8, skill: 1.2, stamina: 26 },
};

/** Their moves, only ever on the parts of her she put in play; a kiss is always part of the game. */
const THEIR_MOVES: Record<"kiss" | DuelArea, { power: number; meter: Meter; line: string }> = {
  kiss: { power: 5, meter: "mouth", line: "They pull you in for a kiss." },
  hands: { power: 6, meter: "body", line: "Their hands roam all over you." },
  mouth: { power: 7, meter: "mouth", line: "They kiss you hard, and you forget to breathe." },
  breasts: { power: 8, meter: "breasts", line: "Their hands find your breasts." },
  butt: { power: 8, meter: "butt", line: "They grab your butt and pull you close." },
  pussy: { power: 12, meter: "pussy", line: "Their fingers slip between your thighs." },
};

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
/** Tease takes this much off their next move. */
const TEASE_SLOW = 0.4;
/** Their move tires them by this much; spent, they skip a turn and get some back. */
const THEIR_COST = 3;
const THEIR_REST = 9;
/** What their move adds to the meter it lands on. */
const THEIR_METER = 5;

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

export interface DuelChoice {
  move: DuelMove;
  label: string;
  disabled: boolean;
}

export class Duel {
  readonly maxStamina: number;
  stamina: number;
  pleasure = 0;
  readonly theirMax: number;
  theirStamina: number;
  theirPleasure = 0;
  outcome: DuelOutcome | null = null;
  readonly log: string[] = [];
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
  private teased = false;

  constructor(
    readonly kind: GuestKind,
    readonly areas: ReadonlySet<DuelArea>,
    readonly stake: number,
    private readonly stats: DuelistStats,
    private readonly random: () => number,
  ) {
    this.maxStamina = this.stamina = BASE_STAMINA + (stats.level("endurance") - 1) * 3 + stats.stamina;
    this.theirMax = this.theirStamina = PARTNERS[kind].stamina;
    this.log.push(`The ${kind} grins. "Loser pays ${stake} gold. Say stop whenever you like."`);
  }

  get state(): DuelState {
    return this.pleasure >= EDGE_AT ? "edge" : this.pleasure >= AROUSED_AT ? "aroused" : "calm";
  }

  /** How much harder her moves land, by how she's feeling. */
  private stateBoost(): number {
    const s = this.state;
    return s === "edge" ? 1.5 + this.stats.edge : s === "aroused" ? 1.25 : 1;
  }

  /** Pleasure a move of hers gives them. */
  power(move: Exclude<DuelMove, "hold" | "stop">): number {
    const def = MOVES[move];
    const skill = 1 + (this.stats.level(def.skill) - 1) * 0.1;
    const charm = move === "tease" ? (this.stats.level("charm") - 1) * 1.5 : 0;
    const bare = 1 + this.undressed * (UNDRESS_BONUS + this.stats.undress);
    return Math.round((def.power + charm) * skill * bare * this.stateBoost() * (1 + this.stats.power) * PARTNERS[this.kind].resist);
  }

  /** What Hold Back would take off her pleasure now: less the closer she is. */
  holdAmount(): number {
    const s = this.state;
    const factor = s === "edge" ? 0.4 : s === "aroused" ? 0.6 : 1;
    return Math.max(1, Math.round((HOLD_BACK + (this.stats.level("mind") - 1) * 2) * factor * Math.max(0.1, 1 + this.stats.hold)));
  }

  /** Her moves now. Stop is always there, and always works. */
  choices(): DuelChoice[] {
    const out: DuelChoice[] = [];
    for (const move of Object.keys(MOVES) as (keyof typeof MOVES)[]) {
      const def = MOVES[move];
      if (def.area && !this.areas.has(def.area)) continue;
      if (move === "undress") {
        if (this.undressed >= MAX_UNDRESS) continue;
        out.push({ move, label: this.undressed === 0 ? "Undress down to your shift" : "Undress completely", disabled: false });
        continue;
      }
      const tired = this.stamina < def.cost;
      out.push({ move, label: `${def.label} · +${this.power(move)} · ${def.cost} stamina${tired ? " (too tired)" : ""}`, disabled: tired });
    }
    out.push({ move: "hold", label: `Hold back (Mind) · -${this.holdAmount()} to you`, disabled: false });
    out.push({ move: "stop", label: "Stop", disabled: false });
    return out;
  }

  private gain(id: StatId | SkillId, n: number): void {
    this.xp[id] = (this.xp[id] ?? 0) + n;
  }

  /** She makes her move; then, if it isn't over, they make theirs. */
  act(move: DuelMove): void {
    if (this.outcome) return;
    this.used[move] = (this.used[move] ?? 0) + 1;
    if (move === "stop") {
      this.log.push("You call it off. They nod, and step back.");
      this.outcome = "stopped";
      return;
    }
    if (move === "hold") {
      const n = this.holdAmount();
      this.pleasure = Math.max(0, this.pleasure - n);
      this.stamina = Math.min(this.maxStamina, this.stamina + HOLD_STAMINA);
      this.heldBack++;
      this.gain("mind", 2);
      this.log.push(`You slow down and catch your breath. (-${n})`);
    } else {
      const def = MOVES[move];
      if (def.area && !this.areas.has(def.area)) return;
      if (move === "undress") {
        if (this.undressed >= MAX_UNDRESS) return;
      } else if (this.stamina < def.cost) return;
      const n = this.power(move);
      this.stamina -= def.cost;
      this.theirPleasure = Math.min(PLEASURE_MAX, this.theirPleasure + n);
      this.pleasure = Math.min(PLEASURE_MAX, this.pleasure + def.self);
      this.gain(def.skill, move === "kiss" || move === "caress" || move === "tease" ? 1 : 3);
      if (move === "tease") this.teased = true;
      if (move === "undress") {
        this.undressed++;
        this.log.push(this.undressed === 1 ? `You let your dress fall, slowly. They stare. (+${n})` : `You slip out of the rest. (+${n})`);
      } else this.log.push(`${def.line} (+${n})`);
      if (this.theirPleasure >= PLEASURE_MAX) {
        this.wonOnEdge = this.state === "edge";
        this.log.push("They give in first, with a groan. You win.");
        this.outcome = "won";
        return;
      }
      if (this.pleasure >= PLEASURE_MAX) {
        this.log.push("It's too much. You go first.");
        this.outcome = "lost";
        return;
      }
    }
    this.theirTurn();
  }

  private theirTurn(): void {
    if (this.theirStamina < THEIR_COST) {
      this.theirStamina = Math.min(this.theirMax, this.theirStamina + THEIR_REST);
      this.log.push("They have to stop and catch their breath.");
      return;
    }
    this.theirStamina -= THEIR_COST;
    const options: ("kiss" | DuelArea)[] = ["kiss", ...this.areas];
    // They go for the boldest she's allowed more often than not.
    const pick = this.random() < 0.6 ? options[options.length - 1] : options[Math.floor(this.random() * options.length) % options.length];
    const def = THEIR_MOVES[pick];
    const slowed = this.teased ? 1 - TEASE_SLOW : 1;
    this.teased = false;
    const n = Math.max(
      1,
      Math.round(def.power * PARTNERS[this.kind].skill * (1 + this.stats.sens[def.meter]) * Math.max(0.2, 1 - this.stats.resist) * slowed),
    );
    this.pleasure = Math.min(PLEASURE_MAX, this.pleasure + n);
    this.theirPleasure = Math.min(PLEASURE_MAX, this.theirPleasure + 2);
    this.meterGains[def.meter] = (this.meterGains[def.meter] ?? 0) + THEIR_METER;
    this.gain("endurance", 1);
    this.log.push(`${def.line} (+${n} to you)`);
    if (this.pleasure >= PLEASURE_MAX) {
      this.log.push("It's too much. You go first.");
      this.outcome = "lost";
    }
  }
}
