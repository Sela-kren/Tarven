/**
 * Brawls: a guest who's had too much, or is spoiling for it, starts trouble, and whoever's on the floor deals with
 * it, turn by turn, Karryn-style. She can hit, shove, dodge, talk them down with Charm, stare them down with Mind,
 * and once they're worn out, throw them out.
 *
 * Grabs, headlocks, hair-pulls, tackles and the rest of their grapples (FOE_GRAPPLES: bear hugs, arm twists,
 * pins, sweeps, collar hauls) are fighting, on both sides: combat moves like a punch, not touches, so they never
 * ask her anything.
 *
 * A foe who came in worked up may stop swinging and reach for her instead. That isn't a fight move: the fight
 * stops on it (`reaching`) and the tavern asks her on the usual touch screen (Let it / Lean in / Slap / Pull away;
 * Pull away always works). Her answer comes back through `afterReach`.
 *
 * Her desire comes into the fight with her, Karryn-style (desire.ts): past 50 each desire gets in her way, twice as
 * much past 80 (horny); their grapples stir the part their type goes for; she can suppress it for willpower; and
 * her Cock desire opens up her hands, her mouth and riding them (wet), which wear them out instead of her fists.
 *
 * Win, and they're out the door and the room thinks the more of her. Lose, and they grab what they can from the
 * till. Anything offered after a loss is the tavern's to offer, and hers to turn down (GAME_PATH.MD, "Brawl loss").
 */
import { statsOf, type RoleStats } from "./guestroles";
import type { GuestKind } from "./tavern";
import type { StatId } from "./skills";
import { flavor } from "./flavor";
import { HIT_WILL, maxWillpower, STARE_WILL, STEEL_STAMINA, STEEL_WILL } from "./willpower";
import {
  desirePenalties,
  horny,
  HORNY_AT,
  INTIMATE_MOVES,
  METER_OF_AREA,
  suppressAmount,
  suppressCost,
  wet,
  type DesirePenalties,
  type IntimateMove,
} from "./desire";
import { METER_NAMES, METER_MAX, METERS, type Meter, type Meters } from "./passives";
import type { DuelArea } from "./duel";

export type FightMove =
  | "strike"
  | "shove"
  | "grab"
  | "headlock"
  | "hairpull"
  | "tackle"
  | "dodge"
  | "talk"
  | "stare"
  | "steel"
  | "suppress"
  | "suppressCock"
  | IntimateMove
  | "throw";
export type FightOutcome = "won" | "talked" | "lost";

/**
 * What a guest shouts at her as trouble boils up, before they come for her: an angry guest's spite, or a
 * roaring drunk's slurring. Said out loud over their head, and written in the log.
 */
export const TROUBLE_SHOUTS: Record<"angry" | "drunk", readonly string[]> = {
  angry: [
    "Oi! Innkeeper! I've waited long enough!",
    "You think you can ignore me? Think again.",
    "This place is a pigsty, and you're the one running it.",
    "Walk past me one more time. Go on. I dare you.",
    "Somebody's going to pay for this, and it's you.",
    "Think you own this pass? Let's see about that.",
    "I've had it with you. Come here!",
    "Sneer at me, will you? I'll wipe that look off.",
  ],
  drunk: [
    "Wha' are YOU lookin' at?",
    "Shtop the room spinning! ...It's you, innit? You're doin' it!",
    "I could take you. I could take ALL of you!",
    "Watered ale! You watered it! I'll show you watered!",
    "C'mere. C'mere! Nobody cuts me off!",
    "Another round! ...No? NO? Right!",
    "Wanna dance? No? Then we'll FIGHT!",
    "I'm not drunk! You're drunk! Come 'ere and say that!",
  ],
};

const BASE_STAMINA = 20;
/** Worn down to this share of their stamina, and they can be thrown out. */
const THROW_AT = 0.3;
/** How much her grip on their arm throws off their next swing, and theirs on her, her next move. */
const HOLD_ACCURACY = 0.3;
const HELD_CHANCE = 0.15;
/** A hair-pull leaves their eyes watering: this much off their aim, down to the floor below. */
const HAIRPULL_ACCURACY = 0.05;
const MIN_ACCURACY = 0.3;
/** Stamina a missed tackle costs her, hitting the floor. */
const TACKLE_MISS = 2;
/** Of their blows that land, how many are grapples instead of a fist. */
const FOE_GRAPPLE = 0.35;

/**
 * Their grapples, Karryn-style: a whole set of ways to get hold of her, each its own hurt. All of them fighting,
 * never a touch, so none of them asks her anything. Grab comes first: a roll of 0 is always a grab.
 */
export type FoeGrapple = "grab" | "headlock" | "hairpull" | "tackle" | "bearhug" | "armtwist" | "pin" | "sweep" | "collar";
interface GrappleDef {
  /** Added to their attack for the hurt. */
  damage: number;
  /** Willpower it knocks out of her, in blows' worth. */
  will: number;
  /** Leaves her caught: her next move is harder. */
  holds?: boolean;
  text: string;
}
export const FOE_GRAPPLES: Record<FoeGrapple, GrappleDef> = {
  grab: { damage: -2, will: 1, holds: true, text: "They grab your arm and wrench it round. You're caught." },
  headlock: { damage: 0, will: 2, text: "They get you in a headlock and squeeze." },
  hairpull: { damage: -1, will: 2, text: "They grab a fistful of your hair and yank." },
  tackle: { damage: 1, will: 1, text: "They barrel into you and you both go into a table." },
  bearhug: { damage: 0, will: 1, holds: true, text: "They get both arms round you from behind and crush the air out of you." },
  armtwist: { damage: -1, will: 1, holds: true, text: "They twist your arm up behind your back and march you into the bar." },
  pin: { damage: -1, will: 2, holds: true, text: "They slam you back against the wall and hold you there by the shoulders." },
  sweep: { damage: 0, will: 1, holds: true, text: "They hook your ankle and dump you on the floorboards." },
  collar: { damage: -1, will: 2, text: "They haul you up by the collar and shake you like a rag." },
};
/** Each kind's favourite grapples, three times as likely as the rest: a brute crushes, a smuggler trips. */
const GRAPPLE_FAVOURITES: Record<GuestKind, readonly FoeGrapple[]> = {
  farmer: ["bearhug", "tackle", "grab"],
  soldier: ["headlock", "armtwist", "pin"],
  smuggler: ["armtwist", "sweep", "hairpull"],
  fugitive: ["grab", "sweep", "hairpull"],
  adventurer: ["headlock", "tackle", "sweep"],
  bandit: ["bearhug", "pin", "collar", "hairpull"],
  noble: ["collar", "hairpull", "grab"],
};
const FAVOURITE_WEIGHT = 3;

/** Which grapple a foe of this kind goes for, from a roll of 0 to 1. */
export function pickGrapple(kind: GuestKind, roll: number): FoeGrapple {
  const all = Object.keys(FOE_GRAPPLES) as FoeGrapple[];
  const weights = all.map((g) => (GRAPPLE_FAVOURITES[kind]?.includes(g) ? FAVOURITE_WEIGHT : 1));
  let left = roll * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < all.length; i++) {
    left -= weights[i];
    if (left < 0) return all[i];
  }
  return all[all.length - 1];
}
/** A worked-up foe's chance, each turn, to reach for her instead of swinging; and how many times a fight. */
const REACH_IN_BRAWL = 0.2;
const MAX_REACHES = 2;
/** Desire a grapple of theirs stirs: in the part their type goes for, and a little all over. */
const GRAPPLE_DESIRE = 5;
const GRAPPLE_BODY = 2;
/** Her pleasure stops short of the top in a brawl: being overwhelmed is for the bar, not the floor. */
const FIGHT_PLEASURE_MAX = 99;

/** Her side of the fight: her stat levels, and what her passives add. */
export interface FighterStats {
  levels: Record<StatId, number>;
  damage: number;
  dodge: number;
  talk: number;
  stare: number;
  /** Her willpower going in, and at the top. Left out, she starts with all a Mind like hers gives. */
  will?: number;
  maxWill?: number;
  /** The foe came in worked up (strong lust): now and then they reach for her instead of swinging. */
  workedUp?: boolean;
  /**
   * Her desire going in (see desire.ts). Left out (his brawls), desire plays no part: no penalties, no suppressing,
   * nothing intimate.
   */
  desire?: Meters;
  /** How much faster each desire fills, from her passives. */
  sens?: Meters;
  /** Her pleasure going in, 0 to 100. */
  pleasure?: number;
  /** The part of her the foe's type goes for. */
  prefers?: DuelArea;
  /**
   * From her passives: extra chance her grapples land; less hurt from theirs; the share of being held she shrugs
   * off; extra damage from a slap mid-brawl; how much likelier a foe reaches; how much less desire gets in her way.
   */
  grappleHit?: number;
  grappleGuard?: number;
  heldEase?: number;
  brawlSlap?: number;
  brawlReach?: number;
  fightDesire?: number;
  /** Extra stamina from her Level. */
  extraStamina?: number;
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
  /** She has hold of their arm: their next swing is off, and a headlock is on. */
  private holding = false;
  /** They have hold of her: her next move is harder. */
  private held = false;
  private reaches = 0;
  /** They've stopped swinging and reached for her: the fight waits for her answer (`afterReach`). */
  reaching = false;
  /** What just happened, newest last. */
  readonly log: string[] = [];
  /** The event behind each log line (see say), for the comic panel. */
  readonly events: string[] = [];
  outcome: FightOutcome | null = null;
  /** What the foe is called: their type, as in "the brute". */
  readonly name: string;
  /** Experience earned in the fight, for the tavern to hand out at the end. */
  readonly xp: Partial<Record<StatId, number>> = {};
  /** Dodges that worked, for the records. */
  dodges = 0;
  /** Her grapples that landed, theirs that landed on her, and times they had hold of her: for the records. */
  grapplesLanded = 0;
  grapplesTaken = 0;
  timesHeld = 0;
  /** Her willpower: staring down and steeling herself spend it, blows that land wear it down. */
  will: number;
  readonly maxWill: number;
  /** Her desire through the fight, or null when it plays no part. The tavern takes it back at the end. */
  readonly desire: Meters | null;
  pleasure: number;
  /** What she did with her hands and mouth, for the records. */
  readonly acts: Partial<Record<IntimateMove, number>> = {};
  /** Won by wearing them out with her hands, mouth or the rest, rather than her fists. */
  spent = false;

  constructor(
    readonly guestId: number,
    readonly kind: GuestKind,
    readonly drunk: boolean,
    private readonly stats: FighterStats,
    private readonly random: () => number,
    /** Their own numbers, rolled from their type: a brute hits harder than a mage, and lasts longer. */
    rolled?: RoleStats,
  ) {
    const who = rolled ?? statsOf(kind);
    const foe = who.fight;
    const name = (this.name = who.label.toLowerCase());
    this.maxStamina = this.stamina = BASE_STAMINA + (stats.levels.endurance - 1) * 4 + (stats.extraStamina ?? 0);
    this.foeMax = this.foeStamina = foe.stamina;
    this.foeAttack = foe.attack + (drunk ? 1 : 0);
    this.foeAccuracy = foe.accuracy - (drunk ? 0.15 : 0);
    this.maxWill = stats.maxWill ?? maxWillpower(stats.levels.mind);
    this.will = Math.max(0, Math.min(this.maxWill, stats.will ?? this.maxWill));
    this.desire = stats.desire ? { ...stats.desire } : null;
    this.pleasure = stats.pleasure ?? 0;
    this.say("start", drunk ? `The ${name} is roaring drunk and wants a fight.` : `The ${name} squares up to you.`);
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

  /** What her desire costs her right now; nothing when desire plays no part. */
  get penalties(): DesirePenalties {
    if (!this.desire) return { accuracy: 0, dodge: 0, voice: 0, damage: 0, grapple: 0, reach: 0 };
    // Passives (Scrapper's Blush) take some of the sting out of wanting it.
    const keep = Math.max(0, 1 - (this.stats.fightDesire ?? 0));
    const p = desirePenalties(this.desire);
    return {
      accuracy: p.accuracy * keep,
      dodge: p.dodge * keep,
      voice: p.voice * keep,
      damage: Math.round(p.damage * keep),
      grapple: p.grapple * keep,
      reach: p.reach * keep,
    };
  }

  /** Any desire at 80 or more. */
  get horny(): boolean {
    return this.desire ? horny(this.desire) : false;
  }

  /** Wet enough to ride them. */
  get wet(): boolean {
    return this.desire ? wet(this.desire.pussy, this.pleasure) : false;
  }

  /** The tavern's view of her desire and pleasure, after the touch screen has had its say mid-fight. */
  setDesire(desire: Readonly<Meters>, pleasure: number): void {
    if (!this.desire) return;
    Object.assign(this.desire, desire);
    this.pleasure = pleasure;
  }

  private chances(): Record<FightMove, number> {
    const { levels, talk, stare } = this.stats;
    const agi = (levels.agility - 1) * 0.03;
    const str = (levels.strength - 1) * 0.04;
    const end = (levels.endurance - 1) * 0.02;
    // In their grip, everything but a dodge is harder; and wanting it throws her aim off (Mouth desire).
    const p = this.penalties;
    // Hold Breaker shrugs off part of being held; Wrestler makes her grapples likelier.
    const off = (this.held ? HELD_CHANCE * Math.max(0, 1 - (this.stats.heldEase ?? 0)) : 0) + p.accuracy;
    const grip = this.stats.grappleHit ?? 0;
    return {
      strike: Math.min(0.95, 0.7 + agi) - off,
      shove: Math.min(0.95, 0.8 + agi) - off,
      grab: Math.min(0.95, 0.75 + agi + grip) - off,
      headlock: Math.min(0.95, 0.65 + str + grip) - off,
      hairpull: Math.min(0.95, 0.85 + agi + grip) - off,
      tackle: Math.min(0.9, 0.55 + str + end + grip) - off,
      dodge: 1,
      // With no willpower left she's rattled, and it shows in her voice; so does wanting it (Pussy desire).
      talk: clamp01(
        0.15 + (levels.charm - 1) * 0.07 + talk - (this.drunk ? 0.1 : 0) - (this.kind === "soldier" ? 0.1 : 0) - (this.will <= 0 ? 0.1 : 0) - p.voice,
      ),
      stare: clamp01(0.1 + (levels.mind - 1) * 0.06 + stare - p.voice),
      steel: 1,
      suppress: 1,
      suppressCock: 1,
      hands: 1,
      mouth: 1,
      ride: 1,
      throw: 1,
    };
  }

  /** Damage behind her blows: Body desire takes some of the weight out of them. */
  private blow(base: number): number {
    return Math.max(1, base - this.penalties.damage);
  }

  /** Raises a desire mid-fight, faster with passives that make it so. */
  private stir(meter: Meter, n: number): number {
    if (!this.desire || n <= 0) return 0;
    const before = this.desire[meter];
    this.desire[meter] = Math.min(METER_MAX, before + n * (1 + (this.stats.sens?.[meter] ?? 0)));
    return Math.round(this.desire[meter] - before);
  }

  /** The intimate moves she has: shown once desire plays a part, ready when her Cock desire (and wetness) allow. */
  private intimateChoices(): FightChoice[] {
    const desire = this.desire;
    if (!desire) return [];
    return (Object.keys(INTIMATE_MOVES) as IntimateMove[]).map((move) => {
      const def = INTIMATE_MOVES[move];
      const short = desire.cock < def.cock;
      const dry = def.wet === true && !this.wet;
      const need = short ? ` (needs Cock desire ${def.cock})` : dry ? " (needs you wet)" : ` · -${def.drain} their stamina`;
      return { move, label: `${def.label}${need}`, chance: null, disabled: short || dry };
    });
  }

  /** Suppressing: one for everything but Cock, one for Cock, each paid in willpower (dearer while horny). */
  private suppressChoices(): FightChoice[] {
    const desire = this.desire;
    if (!desire) return [];
    const isHorny = this.horny;
    const others = suppressCost(false, isHorny);
    const cock = suppressCost(true, isHorny);
    const anyOther = METERS.some((m) => m !== "cock" && desire[m] > 0);
    return [
      { move: "suppress", label: `Suppress desire (Mind) · ${others} will`, chance: null, disabled: this.will < others || !anyOther },
      { move: "suppressCock", label: `Suppress Cock desire (Mind) · ${cock} will`, chance: null, disabled: this.will < cock || desire.cock <= 0 },
    ];
  }

  /** What she can do now, with the chance each has. */
  choices(): FightChoice[] {
    const c = this.chances();
    const canThrow = this.foeStamina <= this.foeMax * THROW_AT;
    return [
      { move: "strike", label: "Strike", chance: c.strike, disabled: false },
      { move: "shove", label: "Shove", chance: c.shove, disabled: false },
      // One button: grab their arm, then, with hold of them, it's a headlock.
      this.holding
        ? { move: "headlock", label: "Headlock", chance: c.headlock, disabled: false }
        : { move: "grab", label: "Grab their arm", chance: c.grab, disabled: false },
      { move: "hairpull", label: "Pull their hair", chance: c.hairpull, disabled: false },
      { move: "tackle", label: "Tackle", chance: c.tackle, disabled: false },
      { move: "dodge", label: "Dodge", chance: null, disabled: false },
      { move: "talk", label: "Talk them down (Charm)", chance: c.talk, disabled: false },
      {
        move: "stare",
        label: `Stare them down (Mind) · ${STARE_WILL} will`,
        chance: c.stare,
        disabled: this.shaken || this.will < STARE_WILL,
      },
      {
        move: "steel",
        label: `Steel yourself · +${this.steelStamina()} stamina · ${STEEL_WILL} will`,
        chance: null,
        disabled: this.will < STEEL_WILL || this.stamina >= this.maxStamina,
      },
      ...this.suppressChoices(),
      ...this.intimateChoices(),
      { move: "throw", label: canThrow ? "Throw them out" : "Throw them out (wear them down first)", chance: null, disabled: !canThrow },
    ];
  }

  /** She makes her move; then, if it isn't over, they make theirs. */
  act(move: FightMove): void {
    if (this.outcome || this.reaching) return;
    if (move === "headlock" && !this.holding) return;
    const c = this.chances();
    const roll = this.random();
    const { levels } = this.stats;
    // Whatever she does, she twists out of their grip doing it; and lets go of them unless she's locking it.
    this.held = false;
    if (move !== "headlock") this.holding = false;
    switch (move) {
      case "strike": {
        if (roll < c.strike) {
          const damage = this.blow(3 + (levels.strength - 1) + this.stats.damage);
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
      case "grab": {
        if (roll < c.grab) {
          this.foeStamina = Math.max(0, this.foeStamina - 1);
          this.holding = true;
          this.grapplesLanded++;
          this.say("grab:hit", "You catch their wrist and twist it up behind them. (-1)");
          this.gain("strength", 1);
          this.gain("agility", 1);
        } else this.say("grab:miss", "You grab for their arm and get a fistful of air.");
        break;
      }
      case "headlock": {
        this.holding = false;
        if (roll < c.headlock) {
          const damage = this.blow(3 + (levels.strength - 1) + this.stats.damage);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.staggered = true;
          this.grapplesLanded++;
          this.say("headlock:hit", `You get an arm round their neck and squeeze till they sag. (-${damage})`);
          this.gain("strength", 3);
        } else this.say("headlock:miss", "They wrench free before you can lock it.");
        break;
      }
      case "hairpull": {
        if (roll < c.hairpull) {
          this.foeStamina = Math.max(0, this.foeStamina - 2);
          this.foeAccuracy = Math.max(MIN_ACCURACY, this.foeAccuracy - HAIRPULL_ACCURACY);
          this.grapplesLanded++;
          this.say("hairpull:hit", "You grab a fistful of hair and yank. Their eyes water. (-2)");
          this.gain("agility", 1);
        } else this.say("hairpull:miss", "They jerk their head out of reach.");
        break;
      }
      case "tackle": {
        if (roll < c.tackle) {
          const damage = this.blow(4 + (levels.strength - 1) + this.stats.damage);
          this.foeStamina = Math.max(0, this.foeStamina - damage);
          this.staggered = true;
          this.grapplesLanded++;
          this.say("tackle:hit", `You drive a shoulder into their middle and take them down over a bench. (-${damage})`);
          this.gain("strength", 2);
          this.gain("endurance", 1);
        } else {
          const lost = Math.max(0, Math.min(this.stamina - 1, TACKLE_MISS));
          this.stamina -= lost;
          this.say("tackle:miss", `They sidestep, and you hit the floor. (-${lost})`);
        }
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
        if (this.will < STARE_WILL) return;
        this.will -= STARE_WILL;
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
      case "steel": {
        if (this.will < STEEL_WILL) return;
        this.will -= STEEL_WILL;
        const back = Math.min(this.maxStamina - this.stamina, this.steelStamina());
        this.stamina += back;
        this.gain("mind", 2);
        this.say("steel", `You set your jaw and get your breath back. (+${back} stamina)`);
        break;
      }
      case "suppress":
      case "suppressCock": {
        const desire = this.desire;
        const cock = move === "suppressCock";
        const cost = suppressCost(cock, this.horny);
        if (!desire || this.will < cost) return;
        this.will -= cost;
        const down = suppressAmount(levels.mind);
        for (const m of METERS) if (cock === (m === "cock")) desire[m] = Math.max(0, desire[m] - down);
        this.gain("mind", 2);
        this.say(
          cock ? "suppress:cock" : "suppress",
          cock ? `You shove the thought of them out of your head. (Cock desire -${down})` : `You breathe slow and push the want back down. (desire -${down})`,
        );
        break;
      }
      case "hands":
      case "mouth":
      case "ride": {
        const desire = this.desire;
        const def = INTIMATE_MOVES[move];
        if (!desire || desire.cock < def.cock || (def.wet && !this.wet)) return;
        this.foeStamina = Math.max(0, this.foeStamina - def.drain);
        this.pleasure = Math.min(FIGHT_PLEASURE_MAX, this.pleasure + def.pleasure);
        for (const m of METERS) this.stir(m, def.desire[m] ?? 0);
        this.acts[move] = (this.acts[move] ?? 0) + 1;
        this.gain("charm", 2);
        this.say(`intimate:${move}`, `${def.text} (-${def.drain})`);
        if (this.foeStamina <= 0) {
          this.spent = true;
          this.say("spent", "They're spent. They stagger out into the night grinning, and nobody quite knows where to look.");
          this.outcome = "won";
          return;
        }
        break;
      }
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

  /** What steeling herself gives back: more the cooler her head. */
  private steelStamina(): number {
    return STEEL_STAMINA + Math.max(0, this.stats.levels.mind - 1);
  }

  private theirTurn(): void {
    if (this.staggered) {
      this.staggered = false;
      this.say("staggered", "They're still finding their feet.");
      return;
    }
    // Worked up, they may stop swinging and reach for her: the fight waits for her answer on the touch screen.
    // Her Cock desire draws them on, and once it burns, any foe might.
    const p = this.penalties;
    const tempted = this.stats.workedUp || (this.desire?.cock ?? 0) >= HORNY_AT;
    if (tempted && this.reaches < MAX_REACHES && this.random() < REACH_IN_BRAWL + p.reach + (this.stats.brawlReach ?? 0)) {
      this.reaches++;
      this.reaching = true;
      this.dodging = false;
      this.say("their:reach", `The ${this.name} stops swinging and reaches for you instead.`);
      return;
    }
    // Breasts desire makes her slow to twist away.
    const dodge = this.dodging ? Math.max(0, 0.35 + (this.stats.levels.agility - 1) * 0.03 + this.stats.dodge - p.dodge) : 0;
    const dodged = this.dodging;
    this.dodging = false;
    // Her hold on their arm throws their swing off; they shake loose as they swing.
    const off = this.holding ? HOLD_ACCURACY : 0;
    if (this.random() < this.foeAccuracy - dodge - off) {
      this.theirBlow();
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

  /** A blow of theirs that lands: a fist, or now and then a grapple. Fighting, every one of them. */
  private theirBlow(): void {
    const hurt = (damage: number, will: number, event: string, text: string) => {
      const n = Math.max(1, damage);
      this.stamina = Math.max(0, this.stamina - n);
      this.will = Math.max(0, this.will - will);
      this.say(event, `${text} (-${n})`);
      this.gain("endurance", 1);
    };
    this.holding = false;
    // Butt desire: they'd rather get their hands on her than punch.
    if (this.random() >= FOE_GRAPPLE + this.penalties.grapple) {
      hurt(this.foeAttack, HIT_WILL, "their:hit", "They catch you one.");
      return;
    }
    // A grapple: their hands wander on the way, to the part of her their type goes for.
    this.wander();
    const pick = pickGrapple(this.kind, this.random());
    const def = FOE_GRAPPLES[pick];
    this.grapplesTaken++;
    if (def.holds) {
      this.held = true;
      this.timesHeld++;
    }
    // Thick Skin: their grapples hurt less.
    hurt(this.foeAttack + def.damage - (this.stats.grappleGuard ?? 0), HIT_WILL * def.will, `their:${pick}`, def.text);
  }

  /** Their hands wander in a grapple: her desire for the part their type goes for rises, and a little all over. */
  private wander(): void {
    if (!this.desire) return;
    const meter = METER_OF_AREA[this.stats.prefers ?? "hands"];
    const n = this.stir(meter, GRAPPLE_DESIRE);
    if (meter !== "body") this.stir("body", GRAPPLE_BODY);
    if (n > 0) this.say("their:wander", `Their hands wander while they have hold of you. (+${n} ${METER_NAMES[meter]} desire)`);
  }

  /**
   * She's answered their reach on the touch screen, and the fight picks up. A slap rocks them back; pulling away
   * gets her clear; a yes leaves them slow to get back to swinging. `will` is what she has left after answering.
   */
  afterReach(answer: "yes" | "slap" | "pull", will: number): void {
    if (!this.reaching) return;
    this.reaching = false;
    this.will = Math.max(0, Math.min(this.maxWill, will));
    if (answer === "slap") {
      // Stinging Reply: a slap mid-brawl hits harder.
      const sting = 2 + (this.stats.brawlSlap ?? 0);
      this.foeStamina = Math.max(0, this.foeStamina - sting);
      this.say("reach:slap", `Your slap rocks them back on their heels. (-${sting})`);
      if (this.foeStamina <= 0) {
        this.say("knockout", "They go down and stay down. A couple of regulars carry them out.");
        this.outcome = "won";
      }
    } else if (answer === "pull") {
      this.say("reach:pull", "You twist clear and get your guard back up.");
    } else {
      this.staggered = true;
      this.say("reach:yes", "They're slow to get back to swinging.");
    }
  }
}

function clamp01(n: number): number {
  return Math.min(0.95, Math.max(0.05, n));
}
