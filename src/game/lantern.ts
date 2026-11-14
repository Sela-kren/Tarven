/**
 * The Lantern, Stage I: "A lamp in the window" (STORY.md, section 12, "How the Lantern runs"). One upstairs room
 * and one girl, Tamsin.
 *
 * Once the brothel is open to her (tavern.ts, `unlockBrothel`), the madam can hang a lantern from the house plans
 * and furnish the plain room upstairs. Each day she decides whether tonight the lantern is lit. A lit night brings
 * a rougher crowd (more soldiers, smugglers and adventurers, fewer farmers), costs her a little respect and draws a
 * little heat (there's no licence yet), and lets lustful guests ask for company. Each ask opens a booking card: the
 * girl, the room and the price. The madam sends them up or turns them away; then the girl decides for herself.
 * Bookings happen off screen, on a timer, with no scene: the guest comes down later and pays.
 *
 * Fixed and not negotiable: every girl is an adult who chose the work. She can refuse any guest, and she can quit.
 * The madam's house rules are about money and protection only, never consent, and nothing here routes the
 * heroine herself into a booking: her own invitations upstairs stay exactly as they were. The Baron is never a
 * client.
 *
 * This file holds the rules; tavern.ts wires them in through a small `LanternHost`, and lanternplans.ts puts the
 * builds and switches on the house plans.
 */
import type { Persona } from "./banter";
import { mindStage, mindStageName } from "./lewd";
import { feltMood, STRONG_LUST } from "./mood";
import { FANS_DELIGHTED, FANS_HAPPY } from "./ledger";
import type { Arrival, Cue, Guest, GuestKind, TalkChoice, TalkLine } from "./tavern";

/** Where a Lantern night's chances come from: who asks for company, and how it goes. Tests pin it. */
export const lanternDice: { roll: (() => number) | null } = { roll: Math.random };

// The builds, from the house plans.
/** Hanging the lantern in the window. */
export const LANTERN_COST = 30;
/** The plain room upstairs: a bed, a washstand, a lock on the door. Cheap. */
export const ROOM_COST = 15;

// What a lit night does to the house (STORY.md, "Lit or dark").
/** Respect lost each lit night: the village sees the lamp. */
export const LIT_RESPECT = -1;
/** Heat drawn each lit night, until she holds the Baron's licence (a later stage). */
export const LIT_HEAT = 1;
/** The share of farmers walking in alone who stay away on a lit night, and who comes instead. */
export const LIT_SWAP = 0.5;
export const LIT_CROWD: readonly GuestKind[] = ["soldier", "smuggler", "adventurer"];

// A booking.
/** Seconds of service a booking takes upstairs, while the room's door lamp is lit. */
export const BOOKING_TIME = 25;
/** The plain room's price, before the girl's appeal. */
export const PLAIN_ROOM_PRICE = 10;
/** What the plain room adds to a guest's satisfaction. Better rooms come later. */
export const PLAIN_ROOM_COMFORT = 0;
/** How lustful (0–10) a guest has to be to ask for company. A drunk one, let up by the house, asks sooner. */
export const ASK_LUST = STRONG_LUST;
export const DRUNK_ASK_LUST = 3;
/** The chance a lustful guest asks, as she serves them; more for a girl with more appeal, or of their sort. */
export const ASK_CHANCE = 0.35;
export const ASK_MAX = 0.6;
/** A happy guest comes down this satisfied (0–10) or more: fame, and a tip of what's above it. */
export const HAPPY_AT = 7;
/** A booking she enjoyed: this satisfied, with a guest of her knack. It counts toward her lewdness. */
export const ENJOYED_AT = 8;
/** Below this satisfied, they come down sour: no fans from them. */
export const SOUR_BELOW = 4;

/** Fans from a guest coming down from a booking: delighted if grinning, happy if satisfied, nothing if sour. */
export function fansFromBooking(pleased: number): number {
  return pleased >= HAPPY_AT ? FANS_DELIGHTED : pleased >= SOUR_BELOW ? FANS_HAPPY : 0;
}

// The house rules (STORY.md, "The girls"). Fair is where every house starts.
export type HouseRule = "cut" | "rough" | "rest" | "drunk";
export type RuleChoice = "fair" | "greedy";
export const HOUSE_RULES: readonly HouseRule[] = ["cut", "rough", "rest", "drunk"];
/** The girl's share of what a booking takes, by the cut. */
export const CUT_SHARE: Record<RuleChoice, number> = { fair: 0.5, greedy: 0.25 };
/** Each greedy rule in force on a lit night pushes every girl's corruption up this much, on top of the drift. */
export const GREEDY_PUSH = 3;
/** ...and the madam's own, by this much: running the Lantern doesn't corrupt her, only the greedy choices do. */
export const GREEDY_MADAM = 1;
/** Loyalty: a lit night under all-fair rules, and what each greedy thing costs. */
export const FAIR_NIGHT_LOYALTY = 2;
export const GREEDY_CUT_LOYALTY = -2;
/** ...and each greedy rule in force on a lit night wears it down a little more, booked or not. */
export const GREEDY_NIGHT_LOYALTY = -1;
export const ROUGH_KEPT_LOYALTY = -4;
export const TIRED_LOYALTY = -2;
/** An honest girl working for a crooked madam (corruption 80 and up) loses heart each lit night. */
export const CROOKED_MADAM = 80;
export const HONEST_UNDER_CROOK = -3;
/** Worked tired: her charm drops for the booking, and she may fall ill and miss the next night. */
export const TIRED_CHARM = 2;
export const ILL_CHANCE = 0.25;
/** A drunk let upstairs may cause trouble: noise the watch hears about. */
export const DRUNK_TROUBLE = 0.35;

// Corruption spreads (STORY.md, "Corruption spreads").
/** Each lit night a girl's corruption closes this much of the gap to the madam's. */
export const DRIFT = 0.1;
/** Resolve (0–10) slows the drift: a girl at 10 drifts at half speed. */
export const RESOLVE_SLOWS = 0.05;
/** Falling is slow: a cleaner madam pulls a girl down at half speed. */
export const FALL_SPEED = 0.5;

/** How each house rule reads on the house plans, fair and greedy. */
export const RULE_TEXT: Record<HouseRule, { name: string; fair: string; greedy: string; detail: string }> = {
  cut: {
    name: "The cut",
    fair: "half to the girl",
    greedy: "most to the house",
    detail: "Fair: she keeps half of every booking. Greedy: she keeps a quarter. More gold, but her loyalty falls and her corruption rises.",
  },
  rough: {
    name: "Rough guests",
    fair: "shown the door",
    greedy: "kept for the coin",
    detail: "Fair: angry or brutish guests don't go upstairs, and you see them out. Greedy: they can book. Loyalty down, corruption up, and she's likelier to refuse.",
  },
  rest: {
    name: "Rest",
    fair: "a night off when she's spent",
    greedy: "worked tired",
    detail: "Fair: once her stamina's spent she takes a night off. Greedy: she works on tired. Guests are less happy, and she may fall ill.",
  },
  drunk: {
    name: "Drunk guests",
    fair: "turned away from the stairs",
    greedy: "let up",
    detail: "Fair: drunk guests don't go upstairs. Greedy: they can book, and ask sooner. More bookings, more trouble.",
  },
};

/**
 * Guests who are never clients, whatever the house rules: the Baron is leverage, never a client (STORY.md,
 * section 12). No guest type is him yet; the check stands for when one is.
 */
export const NEVER_CLIENTS: readonly string[] = ["baron"];

/** One of the Lantern's girls: an adult who chose the work, with her own numbers (STORY.md, "The girls"). */
export interface Girl {
  id: string;
  name: string;
  age: number;
  /** Why she came, for the house plans. */
  about: string;
  /** How many guests ask for her, 0–10. */
  appeal: number;
  /** How happy guests come down, 0–10. */
  charm: number;
  /** Bookings she can take before she needs a night off. */
  stamina: number;
  /** Whether she stays, 0–100. At 0 she walks. */
  loyalty: number;
  /** The guests she's best with. */
  knack: GuestKind;
  /** How crooked she's become, on the madam's scale (honest under 40, shady, crooked at 80, rotten at 150). */
  corruption: number;
  /** How slowly her corruption drifts, 0–10. */
  resolve: number;
  /** Bookings taken since her last night off. */
  fatigue: number;
  /** Nights left before she's over an illness. */
  ill: number;
  /** She's left the house. */
  quit: boolean;
  /** Her own records: her lewdness is worked out from these, the way the heroine's is. */
  records: { bookings: number; enjoyed: number; refused: number };
  /** What she's been paid, all told. */
  purse: number;
}

/** Tamsin (26): she worked unpaid at the Velvet House and came to the Lantern for a fair share. Starts shady. */
export function tamsin(): Girl {
  return {
    id: "tamsin",
    name: "Tamsin",
    age: 26,
    about: "Worked unpaid at the Velvet House, and came to you for a fair share. She knows the trade, and its tricks.",
    appeal: 6,
    charm: 6,
    stamina: 4,
    loyalty: 55,
    knack: "soldier",
    corruption: 45,
    resolve: 5,
    fatigue: 0,
    ill: 0,
    quit: false,
    records: { bookings: 0, enjoyed: 0, refused: 0 },
    purse: 0,
  };
}

/** A booking in the room upstairs: who's up there with her, and for how long yet. */
export interface Booking {
  girlId: string;
  /** What the guest is called, and their sort; they've left the table, so this is all that's kept. */
  label: string;
  kind: GuestKind;
  timeLeft: number;
  price: number;
  tired: boolean;
  rough: boolean;
  drunk: boolean;
}

/** A guest asking for company, and the madam's answer: the booking card. */
export interface BookChat {
  guestId: number;
  girlId: string;
  price: number;
  /** A fair house rule keeping this guest off the stairs, if one does. */
  barred: "rough" | "drunk" | null;
  lines: TalkLine[];
  answered: boolean;
  reply: TalkLine[];
}

/** One Lantern night, for the morning report. */
export interface LanternNight {
  lit: boolean;
  bookings: number;
  /** The house's share of what the room took. */
  takings: number;
  /** The girls' share. */
  cut: number;
  /** Guests the madam turned away, and guests a girl refused. */
  turnedAway: number;
  refused: number;
  trouble: string[];
  /** Bookings each girl took tonight, by id. */
  worked: Record<string, number>;
}

/** What the Lantern needs from the tavern: the till, her standing, the log and the guests. */
export interface LanternHost {
  readonly guests: readonly Guest[];
  /** The madam's corruption, which her girls drift toward. */
  readonly madamCorruption: number;
  say(text: string): void;
  /** Gold into the till, counted in tonight's takings. */
  earn(gold: number): void;
  shift(change: Partial<Persona>): void;
  addHeat(n: number): void;
  addCorruption(n: number): void;
  /** Fans for the morning count: a guest who came down pleased talks the place up like one who ate well. */
  addFans(n: number): void;
  guestSays(guest: Guest, text: string): TalkLine;
  nameOf(guest: Guest): string;
  tableOf(seat: number): string;
  /** The guest gets up from their table: upstairs, or out the door. */
  leaveTable(guest: Guest): void;
  cue(sound: Cue): void;
}

/** What lasts between nights. Older saves have none, and start with no lantern. */
export interface LanternSave {
  hung: boolean;
  room: boolean;
  lit: boolean;
  rules: Record<HouseRule, RuleChoice>;
  girls: Girl[];
}

const narrate = (text: string): TalkLine => ({ speaker: null, text });
const you = (text: string): TalkLine => ({ speaker: "You", text });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const KIND_WORDS: Record<GuestKind, string> = {
  farmer: "farmers",
  smuggler: "smugglers",
  soldier: "soldiers",
  fugitive: "strangers",
  adventurer: "adventurers",
  bandit: "bandits",
  noble: "nobles",
};

/** Her tier, on the madam's scale (STORY.md, section 8). */
export function tierOf(corruption: number): "honest" | "shady" | "crooked" | "rotten" {
  if (corruption >= 150) return "rotten";
  if (corruption >= 80) return "crooked";
  if (corruption >= 40) return "shady";
  return "honest";
}

/** Her lewdness, worked out from her own records: 1 for every 3 bookings, 2 for every one she enjoyed. */
export function girlLewdness(girl: Girl): number {
  return Math.floor(girl.records.bookings / 3) + 2 * girl.records.enjoyed;
}

/**
 * Corruption spreads: one lit night's drift of a girl's corruption toward the madam's. It closes about a tenth
 * of the gap, slowed by her resolve; falling toward a cleaner madam goes at half speed.
 */
export function drift(girl: number, madam: number, resolve: number): number {
  const gap = madam - girl;
  const step = gap * DRIFT * (1 - RESOLVE_SLOWS * clamp(resolve, 0, 10)) * (gap < 0 ? FALL_SPEED : 1);
  return Math.max(0, girl + step);
}

/** A rough guest: angry, or a brute. */
export function isRough(guest: Guest): boolean {
  return guest.mood === "angry" || guest.role === "brute";
}

export function isDrunk(guest: Guest): boolean {
  return guest.mood === "drunk";
}

/**
 * How likely she is to turn a guest down. It's always her choice, and never nothing: rough and drunk guests most
 * of all, more when she's tired or sore with the house, less with her own sort. New girls are shy of rough ones.
 */
export function refuseChance(girl: Girl, guest: { rough: boolean; drunk: boolean; kind: GuestKind }, tired: boolean): number {
  const shy = mindStage(girlLewdness(girl)) === 0 ? 0.1 : 0;
  let chance = 0.05;
  if (guest.rough) chance += 0.45 + shy;
  if (guest.drunk) chance += 0.25 + shy;
  if (tired) chance += 0.2;
  if (girl.loyalty < 30) chance += 0.15;
  if (guest.kind === girl.knack) chance -= 0.05;
  return clamp(chance, 0.03, 0.95);
}

/** How pleased a guest comes down, 0–10: her charm and the room, her knack, less tiredness and trouble. */
export function satisfaction(girl: Girl, booking: Pick<Booking, "kind" | "tired" | "rough" | "drunk">): number {
  const score =
    girl.charm +
    PLAIN_ROOM_COMFORT +
    (booking.kind === girl.knack ? 2 : 0) -
    (booking.tired ? TIRED_CHARM : 0) -
    (booking.rough ? 1 : 0) -
    (booking.drunk ? 1 : 0);
  return clamp(score, 0, 10);
}

/** What she's like this morning, in a word or two. */
export function girlMood(girl: Girl): string {
  if (girl.quit) return "gone";
  if (girl.ill > 0) return "ill";
  if (girl.loyalty < 30) return "resentful";
  if (girl.fatigue >= girl.stamina) return "worn out";
  if (girl.loyalty >= 70) return "happy";
  return "steady";
}

const newNight = (lit = false): LanternNight => ({ lit, bookings: 0, takings: 0, cut: 0, turnedAway: 0, refused: 0, trouble: [], worked: {} });

export class Lantern {
  /** The lantern hangs in the window. */
  hung = false;
  /** The plain room upstairs is furnished. */
  room = false;
  /** Her choice for tonight, made during the day. It stays as she left it until she changes it. */
  lit = false;
  rules: Record<HouseRule, RuleChoice> = { cut: "fair", rough: "fair", rest: "fair", drunk: "fair" };
  /** Stage I: one girl, who comes asking for work once the lantern is hung. */
  girls: Girl[] = [];
  /** Who's in the room upstairs, or null while it's free. */
  booking: Booking | null = null;
  /** A guest asking for company, waiting on the madam's answer, or null. */
  chat: BookChat | null = null;
  /** Tonight, as it goes; and last night, for the morning report. */
  tonight: LanternNight = newNight();
  lastNight: LanternNight | null = null;
  /** Where chances come from. Null: nobody asks for company (the tests' default). */
  random: (() => number) | null = lanternDice.roll;

  /** The lantern is lit tonight: decided as the night opens. */
  get litTonight(): boolean {
    return this.tonight.lit;
  }

  /** The room's door lamp is lit: someone's upstairs. */
  get busy(): boolean {
    return this.booking !== null;
  }

  /** The girl who'd take the next booking: the first who's here, well and (under a fair rest rule) not spent. */
  get available(): Girl | null {
    return (
      this.girls.find((g) => !g.quit && g.ill === 0 && (this.rules.rest === "greedy" || g.fatigue < g.stamina)) ?? null
    );
  }

  private roll(): number {
    return this.random ? this.random() : 0.5;
  }

  // The house plans.

  canHang(brothelOpen: boolean, gold: number): boolean {
    return brothelOpen && !this.hung && gold >= LANTERN_COST;
  }

  /** Hangs the lantern, and Tamsin comes asking for work: her choice, for a fair share. */
  hang(host: Pick<LanternHost, "say">): void {
    this.hung = true;
    host.say("You hang the lantern in the window. Tonight, or any night you light it, the house is open for company.");
    if (this.girls.length === 0) {
      this.girls.push(tamsin());
      host.say(
        "Tamsin, 26, knocks before noon. She worked the Velvet House for nothing and wants a house that pays. She'll take bookings on lit nights, and she says who she'll see.",
      );
    }
  }

  canFurnish(gold: number): boolean {
    return this.hung && !this.room && gold >= ROOM_COST;
  }

  furnish(): void {
    this.room = true;
  }

  // The night.

  /**
   * As the night opens: whether the lantern is lit tonight, and what that does. Respect slips and heat rises a
   * little, and the crowd changes: some of the farmers walking in alone stay home, and soldiers, smugglers and
   * adventurers come instead. Parties and whoever carries the rumor come as planned. Returns tonight's arrivals.
   */
  openNight(arrivals: Arrival[], host: LanternHost): Arrival[] {
    this.tonight = newNight(this.hung && this.lit);
    if (!this.tonight.lit) return arrivals;
    host.shift({ respect: LIT_RESPECT });
    host.addHeat(LIT_HEAT);
    let swapped = 0;
    let farmers = 0;
    const mixed = arrivals.map((a) => {
      if (a.kind !== "farmer" || a.party !== undefined || a.rumor) return a;
      // Without dice, every other farmer stays away, so a lit night is the same each time it's played in tests.
      const away = this.random ? this.random() < LIT_SWAP : farmers++ % 2 === 0;
      if (!away) return a;
      return { ...a, kind: LIT_CROWD[swapped++ % LIT_CROWD.length], role: undefined };
    });
    host.say(
      this.room && this.available
        ? "The lantern is lit. Soldiers and smugglers drift in off the road, and the farmers keep to the far tables."
        : "The lantern is lit, but there's no one to take a booking tonight. The crowd comes anyway.",
    );
    return mixed;
  }

  /**
   * A guest she's just served may ask for company: a lustful one, on a lit night, with the room free and a girl
   * to ask for. Opens the booking card. The house rules can keep them off the stairs, but they can still ask.
   */
  maybeAsk(guest: Guest, host: LanternHost): boolean {
    const girl = this.available;
    if (!this.tonight.lit || !this.room || this.busy || this.chat || !girl || !this.random) return false;
    if (NEVER_CLIENTS.includes(guest.role)) return false;
    const drunk = isDrunk(guest);
    const lusty = feltMood(guest) === "lust" || guest.lust >= (drunk && this.rules.drunk === "greedy" ? DRUNK_ASK_LUST : ASK_LUST);
    if (!lusty) return false;
    const chance = Math.min(ASK_MAX, ASK_CHANCE * (girl.appeal / 6) * (guest.kind === girl.knack ? 1.3 : 1));
    if (this.random() >= chance) return false;
    const price = PLAIN_ROOM_PRICE + Math.round(girl.appeal / 2);
    const barred = isRough(guest) && this.rules.rough === "fair" ? "rough" : drunk && this.rules.drunk === "fair" ? "drunk" : null;
    const tired = girl.fatigue >= girl.stamina;
    const share = Math.round(CUT_SHARE[this.rules.cut] * 100);
    this.chat = {
      guestId: guest.id,
      girlId: girl.id,
      price,
      barred,
      answered: false,
      reply: [],
      lines: [
        host.guestSays(guest, "That lamp in the window. Is there company to be had upstairs?"),
        narrate(
          `${girl.name}, ${girl.age}. Good with ${KIND_WORDS[girl.knack]}. ${tired ? "Tired: past her stamina tonight." : `${girl.stamina - girl.fatigue} of ${girl.stamina} bookings before she needs a night off.`}`,
        ),
        narrate(`The plain room upstairs, free. ${price} gold, ${share}% of it to ${girl.name}.`),
      ],
    };
    host.say(`A ${host.nameOf(guest).toLowerCase()} at table ${host.tableOf(guest.seat)} asks about the lantern.`);
    return true;
  }

  /** The madam's answers on the booking card: send them up, or turn them away. Then back to work. */
  options(host: LanternHost): (TalkChoice & { run: () => void })[] {
    const chat = this.chat;
    if (!chat) return [];
    const guest = host.guests.find((g) => g.id === chat.guestId);
    const girl = this.girls.find((g) => g.id === chat.girlId);
    const options: (TalkChoice & { run: () => void })[] = [];
    if (!chat.answered && guest && girl) {
      const rule = chat.barred ? ` (house rule: ${chat.barred === "rough" ? "no rough guests" : "no drunks on the stairs"})` : "";
      options.push({
        label: chat.barred ? `Send them up to ${girl.name}${rule}` : `Send them up to ${girl.name} (${chat.price} gold)`,
        disabled: chat.barred !== null,
        run: () => this.sendUp(chat, guest, girl, host),
      });
      options.push({
        label: chat.barred === "rough" ? "Show them the door" : "Turn them away",
        disabled: false,
        run: () => this.turnAway(chat, guest, host),
      });
    }
    options.push({ label: "Get back to work", disabled: !chat.answered && guest !== undefined, run: () => (this.chat = null) });
    return options;
  }

  /** The madam says no. A rough guest she sees out herself (no doorman yet); anyone else just goes back to their cup. */
  private turnAway(chat: BookChat, guest: Guest, host: LanternHost): void {
    chat.answered = true;
    this.tonight.turnedAway++;
    if (chat.barred === "rough") {
      chat.reply = [
        you("\"Not in this house. Finish your cup somewhere else.\""),
        narrate("With no doorman yet, you walk them to the door yourself. They go, muttering."),
      ];
      host.leaveTable(guest);
      host.say(`You showed the ${host.nameOf(guest).toLowerCase()} the door.`);
      return;
    }
    if (guest.mood === "lust") guest.mood = "gloomy";
    chat.reply = [
      you(chat.barred === "drunk" ? "\"Not like that. Sober up, and ask me another night.\"" : "\"Not tonight.\""),
      host.guestSays(guest, "Your loss, then."),
    ];
  }

  /**
   * The madam would send them up; now it's the girl's say. She looks them over and takes the booking, or turns
   * them down, and a no is the end of it: the house doesn't argue.
   */
  private sendUp(chat: BookChat, guest: Guest, girl: Girl, host: LanternHost): void {
    chat.answered = true;
    const rough = isRough(guest);
    const drunk = isDrunk(guest);
    const tired = girl.fatigue >= girl.stamina;
    if (this.roll() < refuseChance(girl, { rough, drunk, kind: guest.kind }, tired)) {
      girl.records.refused++;
      this.tonight.refused++;
      chat.reply = [
        narrate(`${girl.name} looks them over from the stairs, and shakes her head. "Not this one."`),
        narrate("That's her answer, and the house stands by it. You tell them she isn't free tonight."),
        host.guestSays(guest, "Suit yourself."),
      ];
      host.say(`${girl.name} turned the ${host.nameOf(guest).toLowerCase()} down.`);
      return;
    }
    girl.fatigue++;
    this.booking = { girlId: girl.id, label: host.nameOf(guest), kind: guest.kind, timeLeft: BOOKING_TIME, price: chat.price, tired, rough, drunk };
    chat.reply = [
      narrate(`${girl.name} looks them over and nods. "Give me a moment, then send them up."`),
      narrate("They climb the stairs. Up on the landing, the room's door lamp is lit."),
    ];
    host.leaveTable(guest);
    host.say(`${girl.name} took the ${host.nameOf(guest).toLowerCase()} upstairs. The room is busy.`);
  }

  /** The booking upstairs runs on while she works the room below. */
  update(dt: number, host: LanternHost): void {
    if (!this.booking) return;
    this.booking.timeLeft -= dt;
    if (this.booking.timeLeft <= 0) this.finish(host);
  }

  /**
   * The guest comes down and pays. Satisfaction comes from the girl's charm and the room; a happy guest tips and
   * talks about the place. The girl takes her share by the cut, and the house rules have their say on her.
   */
  finish(host: LanternHost): void {
    const booking = this.booking;
    if (!booking) return;
    this.booking = null;
    const girl = this.girls.find((g) => g.id === booking.girlId);
    if (!girl) return;
    const pleased = satisfaction(girl, booking);
    const tip = Math.max(0, pleased - (HAPPY_AT - 1));
    const total = booking.price + tip;
    const theirs = Math.round(total * CUT_SHARE[this.rules.cut]);
    const house = total - theirs;
    host.earn(house);
    girl.purse += theirs;
    girl.records.bookings++;
    if (pleased >= ENJOYED_AT && booking.kind === girl.knack) girl.records.enjoyed++;
    this.tonight.bookings++;
    this.tonight.worked[girl.id] = (this.tonight.worked[girl.id] ?? 0) + 1;
    this.tonight.takings += house;
    this.tonight.cut += theirs;
    if (pleased >= HAPPY_AT) host.shift({ fame: booking.kind === girl.knack ? 2 : 1 });
    // Satisfied upstairs counts like satisfied at the table: grinning is delighted, satisfied is happy, sour is nothing.
    host.addFans(fansFromBooking(pleased));
    // What the house rules cost her goodwill, booking by booking.
    if (this.rules.cut === "greedy") girl.loyalty += GREEDY_CUT_LOYALTY;
    if (booking.rough) girl.loyalty += ROUGH_KEPT_LOYALTY;
    if (booking.tired) {
      girl.loyalty += TIRED_LOYALTY;
      if (this.roll() < ILL_CHANCE) girl.ill = 1;
    }
    girl.loyalty = clamp(girl.loyalty, 0, 100);
    if (booking.drunk && this.roll() < DRUNK_TROUBLE) {
      host.addHeat(1);
      this.tonight.trouble.push("A drunk upstairs shouted the house down, and the watch heard about it.");
    }
    const mood = pleased >= HAPPY_AT ? "grinning" : pleased >= SOUR_BELOW ? "satisfied" : "sour";
    host.say(
      `The ${booking.label.toLowerCase()} comes down from upstairs, ${mood}, and pays ${total} gold${tip > 0 ? ` with a ${tip} gold tip` : ""}. The house keeps ${house}; ${girl.name} keeps ${theirs}.`,
    );
    host.cue("tip");
  }

  /**
   * At bedtime: a booking still upstairs comes down and pays, and the night has its say on the girls. A lit night
   * drifts their corruption toward the madam's, and greedy rules push it harder; fair nights win loyalty, greedy
   * ones lose it. A girl who took no bookings tonight has rested. A girl with no loyalty left walks.
   */
  endNight(host: LanternHost): void {
    if (this.booking) this.finish(host);
    this.chat = null;
    const night = this.tonight;
    const greedy = HOUSE_RULES.filter((rule) => this.rules[rule] === "greedy");
    if (night.lit && greedy.length > 0) host.addCorruption(GREEDY_MADAM * greedy.length);
    for (const girl of this.girls) {
      if (girl.quit) continue;
      const worked = night.worked[girl.id] ?? 0;
      if (night.lit) {
        girl.corruption = drift(girl.corruption, host.madamCorruption, girl.resolve) + GREEDY_PUSH * greedy.length;
        girl.loyalty += greedy.length === 0 ? FAIR_NIGHT_LOYALTY : GREEDY_NIGHT_LOYALTY * greedy.length;
        if (tierOf(girl.corruption) === "honest" && host.madamCorruption >= CROOKED_MADAM) girl.loyalty += HONEST_UNDER_CROOK;
        girl.loyalty = clamp(girl.loyalty, 0, 100);
      }
      // A night without bookings is a night off: she's rested by morning, and an illness passes. One who fell ill
      // tonight worked tonight, so she misses the next one.
      if (worked === 0) {
        girl.fatigue = 0;
        if (girl.ill > 0) girl.ill--;
      }
      if (girl.loyalty <= 0) {
        girl.quit = true;
        night.trouble.push(`${girl.name} packed her things and left for the Velvet House. She'd had enough of this house.`);
      }
    }
    this.lastNight = night;
  }

  /** A new day: nothing upstairs, nobody asking, and tonight not yet decided. */
  newDay(): void {
    this.booking = null;
    this.chat = null;
    this.tonight = newNight();
  }

  /** The Lantern's lines for the morning report: bookings, room takings, the girl's cut, her mood, any trouble. */
  dawnLines(): string[] {
    const night = this.lastNight;
    if (!this.hung || !night) return [];
    if (!night.lit) return ["The lantern stayed dark last night."];
    const girls = this.girls.map((g) => `${g.name} is ${girlMood(g)}${g.quit ? "" : ` (loyalty ${Math.round(g.loyalty)}, ${tierOf(g.corruption)})`}.`);
    const turned = night.turnedAway + night.refused;
    return [
      `The Lantern: ${night.bookings} booking${night.bookings === 1 ? "" : "s"}, ${night.takings} gold in room takings, ${night.cut} gold to the girls.${turned > 0 ? ` ${turned} turned away.` : ""}`,
      ...girls,
      ...night.trouble,
    ];
  }

  /** Her mind stage, by the heroine's thresholds, for the house plans. */
  stageOf(girl: Girl): string {
    return mindStageName(mindStage(girlLewdness(girl))) || "new";
  }

  save(): LanternSave {
    return { hung: this.hung, room: this.room, lit: this.lit, rules: { ...this.rules }, girls: this.girls.map((g) => structuredClone(g)) };
  }

  /** Puts the Lantern back as saved. Anything missing or broken goes back to its start; no save, no lantern. */
  restore(raw: unknown): void {
    const fresh = new Lantern();
    this.hung = fresh.hung;
    this.room = fresh.room;
    this.lit = fresh.lit;
    this.rules = { ...fresh.rules };
    this.girls = [];
    this.lastNight = null;
    this.newDay();
    if (!raw || typeof raw !== "object") return;
    const save = raw as Partial<LanternSave>;
    this.hung = save.hung === true;
    this.room = this.hung && save.room === true;
    this.lit = this.hung && save.lit === true;
    for (const rule of HOUSE_RULES) if (save.rules?.[rule] === "greedy") this.rules[rule] = "greedy";
    if (Array.isArray(save.girls)) this.girls = save.girls.map(readGirl).filter((g): g is Girl => g !== null);
    // A lantern hung before she arrived (a broken save) still brings Tamsin.
    if (this.hung && this.girls.length === 0) this.girls.push(tamsin());
  }
}

/** A girl from a save: her numbers kept where they make sense, her start where they don't. */
function readGirl(raw: unknown): Girl | null {
  if (!raw || typeof raw !== "object") return null;
  const saved = raw as Partial<Girl>;
  if (saved.id !== "tamsin") return null;
  const girl = tamsin();
  const num = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
  girl.loyalty = num(saved.loyalty, 0, 100, girl.loyalty);
  girl.corruption = num(saved.corruption, 0, 1000, girl.corruption);
  girl.fatigue = Math.floor(num(saved.fatigue, 0, 99, 0));
  girl.ill = Math.floor(num(saved.ill, 0, 9, 0));
  girl.purse = Math.floor(num(saved.purse, 0, 1e6, 0));
  girl.quit = saved.quit === true;
  const records = saved.records ?? girl.records;
  girl.records = {
    bookings: Math.floor(num(records.bookings, 0, 1e5, 0)),
    enjoyed: Math.floor(num(records.enjoyed, 0, 1e5, 0)),
    refused: Math.floor(num(records.refused, 0, 1e5, 0)),
  };
  return girl;
}
