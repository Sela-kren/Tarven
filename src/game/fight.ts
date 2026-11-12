/**
 * Brawls: a guest who's had too much, or is spoiling for it, starts trouble, and whoever's on the floor deals with
 * it, turn by turn, Karryn-style. She can hit, shove, dodge, talk them down with Charm, stare them down with Mind,
 * and once they're worn out, throw them out.
 *
 * Win, and they're out the door and the room thinks the more of her. Lose, and they grab what they can from the
 * till and storm off, and she's left on the floor with her pride hurt. That's all losing ever costs: a fight never
 * leads to anything else.
 */
import type { GuestKind } from "./tavern";
import type { StatId } from "./skills";
import { flavor } from "./flavor";

export type FightMove = "strike" | "shove" | "dodge" | "talk" | "stare" | "throw";
export type FightOutcome = "won" | "talked" | "lost";

/** How tough each kind of guest is in a brawl. */
const FOES: Record<GuestKind, { stamina: number; attack: number; accuracy: number }> = {
  farmer: { stamina: 14, attack: 3, accuracy: 0.55 },
  fugitive: { stamina: 16, attack: 4, accuracy: 0.6 },
  smuggler: { stamina: 18, attack: 4, accuracy: 0.65 },
  soldier: { stamina: 24, attack: 6, accuracy: 0.7 },
};

const BASE_STAMINA = 20;
/** Worn down to this share of their stamina, and they can be thrown out. */
const THROW_AT = 0.3;

/** Her side of the fight: her stat levels, and what her passives add. */
export interface FighterStats {
  levels: Record<StatId, number>;
  damage: number;
  dodge: number;
  talk: number;
  stare: number;
}

export interface FightChoice {
  move: FightMove;
  label: string;
  /** The chance it works, 0 to 1, shown on the button; null for moves that just happen. */
  chance: number | null;
  disabled: boolean;
}

export class Fight {
  readonly maxStamina: number;
  stamina: number;
  readonly foeMax: number;
  foeStamina: number;
  private foeAttack: number;
  private foeAccuracy: number;
  private dodging = false;
  private staggered = false;
  private shaken = false;
  /** What just happened, newest last. */
  readonly log: string[] = [];
  /** The event behind each log line (see say), for the comic panel. */
  readonly events: string[] = [];
  outcome: FightOutcome | null = null;
  /** Experience earned in the fight, for the tavern to hand out at the end. */
  readonly xp: Partial<Record<StatId, number>> = {};
  /** Dodges that worked, for the records. */
  dodges = 0;

  constructor(
    readonly guestId: number,
    readonly kind: GuestKind,
    readonly drunk: boolean,
    private readonly stats: FighterStats,
    private readonly random: () => number,
  ) {
    const foe = FOES[kind];
    this.maxStamina = this.stamina = BASE_STAMINA + (stats.levels.endurance - 1) * 4;
    this.foeMax = this.foeStamina = foe.stamina;
    this.foeAttack = foe.attack + (drunk ? 1 : 0);
    this.foeAccuracy = foe.accuracy - (drunk ? 0.15 : 0);
    this.say("start", drunk ? `The ${kind} is roaring drunk and wants a fight.` : `The ${kind} squares up to you.`);
  }

  /** What happened, then, if the AI has written one, a line of colour for it. */
  private say(event: string, text: string): void {
    this.log.push(text);
    this.events.push(event);
    const extra = flavor(`fight:${event}`, this.kind);
    if (extra) this.log.push(extra);
  }

  private gain(stat: StatId, n: number): void {
    this.xp[stat] = (this.xp[stat] ?? 0) + n;
  }

  private chances(): Record<FightMove, number> {
    const { levels, talk, stare } = this.stats;
    const agi = (levels.agility - 1) * 0.03;
    return {
      strike: Math.min(0.95, 0.7 + agi),
      shove: Math.min(0.95, 0.8 + agi),
      dodge: 1,
      talk: clamp01(0.15 + (levels.charm - 1) * 0.07 + talk - (this.drunk ? 0.1 : 0) - (this.kind === "soldier" ? 0.1 : 0)),
      stare: clamp01(0.1 + (levels.mind - 1) * 0.06 + stare),
      throw: 1,
    };
  }

  /** What she can do now, with the chance each has. */
  choices(): FightChoice[] {
    const c = this.chances();
    const canThrow = this.foeStamina <= this.foeMax * THROW_AT;
    return [
      { move: "strike", label: "Strike", chance: c.strike, disabled: false },
      { move: "shove", label: "Shove", chance: c.shove, disabled: false },
      { move: "dodge", label: "Dodge", chance: null, disabled: false },
      { move: "talk", label: "Talk them down (Charm)", chance: c.talk, disabled: false },
      { move: "stare", label: "Stare them down (Mind)", chance: c.stare, disabled: this.shaken },
      { move: "throw", label: canThrow ? "Throw them out" : "Throw them out (wear them down first)", chance: null, disabled: !canThrow },
    ];
  }

  /** She makes her move; then, if it isn't over, they make theirs. */
  act(move: FightMove): void {
    if (this.outcome) return;
    const c = this.chances();
    const roll = this.random();
    const { levels } = this.stats;
    switch (move) {
      case "strike": {
        if (roll < c.strike) {
          const damage = 3 + (levels.strength - 1) + this.stats.damage;
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.say("strike:hit", `You land a solid blow. (-${damage})`);
          this.gain("strength", 2);
        } else this.say("strike:miss", "You swing and miss.");
        break;
      }
      case "shove": {
        if (roll < c.shove) {
          const damage = 1 + Math.floor((levels.strength - 1) / 2);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.staggered = this.random() < 0.5 + (levels.strength - 1) * 0.05;
          this.say("shove:hit", this.staggered ? `You shove them into a table. They stagger. (-${damage})` : `You shove them back. (-${damage})`);
          this.gain("strength", 1);
        } else this.say("shove:miss", "They stand their ground.");
        break;
      }
      case "dodge":
        this.dodging = true;
        this.say("dodge", "You get light on your feet.");
        break;
      case "talk":
        this.gain("charm", 2);
        if (roll < c.talk) {
          this.say("talk:ok", "You talk them round. They sit back down, sheepish.");
          this.gain("charm", 5);
          this.outcome = "talked";
          return;
        }
        this.foeAttack++;
        this.say("talk:fail", "They don't want to hear it. That made it worse.");
        break;
      case "stare":
        this.gain("mind", 2);
        if (roll < c.stare) {
          this.shaken = true;
          this.foeAttack = Math.max(1, this.foeAttack - 2);
          this.foeAccuracy -= 0.1;
          this.gain("mind", 4);
          if (this.foeStamina <= this.foeMax / 2) {
            this.say("stare:win", "You stare them down. They back away and leave.");
            this.outcome = "won";
            return;
          }
          this.say("stare:ok", "You stare them down. Their nerve falters.");
        } else this.say("stare:fail", "They meet your stare and laugh.");
        break;
      case "throw":
        if (this.foeStamina > this.foeMax * THROW_AT) return;
        this.say("throw", "You haul them up by the collar and throw them out into the snow.");
        this.gain("strength", 3);
        this.outcome = "won";
        return;
    }
    if (this.foeStamina <= 0) {
      this.say("knockout", "They go down and stay down. A couple of regulars carry them out.");
      this.outcome = "won";
      return;
    }
    this.theirTurn();
  }

  private theirTurn(): void {
    if (this.staggered) {
      this.staggered = false;
      this.say("staggered", "They're still finding their feet.");
      return;
    }
    const dodge = this.dodging ? 0.35 + (this.stats.levels.agility - 1) * 0.03 + this.stats.dodge : 0;
    const dodged = this.dodging;
    this.dodging = false;
    if (this.random() < this.foeAccuracy - dodge) {
      this.stamina = Math.max(0, this.stamina - this.foeAttack);
      this.say("their:hit", `They catch you one. (-${this.foeAttack})`);
      this.gain("endurance", 1);
    } else {
      this.say(dodged ? "their:dodged" : "their:miss", dodged ? "You duck under their swing." : "They swing wide.");
      if (dodged) {
        this.dodges++;
        this.gain("agility", 3);
      }
    }
    if (this.stamina <= 0) {
      this.say("lost", "You go down hard.");
      this.outcome = "lost";
    }
  }
}

function clamp01(n: number): number {
  return Math.min(0.95, Math.max(0.05, n));
}
