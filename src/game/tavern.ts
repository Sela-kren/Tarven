/**
 * The rules of the game, with no graphics. The view layer tells this class what
 * the player did and reads the state back, which keeps the rules unit-testable.
 */

export type Item = "ale" | "bread" | "stew" | "cask";
export type GuestKind = "farmer" | "smuggler" | "soldier" | "fugitive";
export type Station = "tap" | "bread" | "pot" | "barrel";
export type Phase = "service" | "lastcall" | "dawn" | "ended";
export type GuestStatus = "arriving" | "waiting" | "eating" | "leaving";
export type PotState = "empty" | "cooking" | "ready" | "burnt";
export type Target = { kind: "station"; station: Station } | { kind: "guest"; id: number };
export type UpgradeId = "quicktap" | "bigpot" | "cushions";
export type EndingId = "arrested" | "overthrow" | "kept" | "lost";

export const DEBT = 150;
export const TRUST_MAX = 15;
export const TRUST_TO_OVERTHROW = 13;
export const HEAT_MAX = 8;
export const UPGRADE_COST = 20;

const START_TRUST = 3;
const TAP_SIZE = 8;
const ALE_SHELF = 2;
const POUR_TIME = 1.5;
const QUICK_POUR_TIME = 0.8;
const STEW_TIME = 8;
const HELPER_COOK_SPEED = 1.5;
const BURN_TIME = 16;
const POT_BOWLS = 3;
const BIG_POT_BOWLS = 5;
const EAT_TIME = 8;
const RUMOR_EAT_TIME = 14;
const LISTEN_TIME = 3;
const CUSHION_PATIENCE = 1.25;
/** Serving with more than this share of patience left earns the tip. */
const TIP_THRESHOLD = 0.5;

interface KindRules {
  patience: number;
  pay: number;
  tip: number;
  trust: number;
  walkoutHeat: number;
}

export const GUEST_KINDS: Record<GuestKind, KindRules> = {
  farmer: { patience: 55, pay: 4, tip: 2, trust: 1, walkoutHeat: 0 },
  smuggler: { patience: 40, pay: 9, tip: 4, trust: 0, walkoutHeat: 0 },
  soldier: { patience: 30, pay: 6, tip: 1, trust: 0, walkoutHeat: 2 },
  fugitive: { patience: 45, pay: 5, tip: 3, trust: 1, walkoutHeat: 0 },
};

export const UPGRADES: Record<UpgradeId, { name: string; detail: string }> = {
  quicktap: { name: "Better tap", detail: "Ale pours almost twice as fast." },
  bigpot: { name: "Bigger pot", detail: "Each pot makes 5 bowls instead of 3." },
  cushions: { name: "Cushions", detail: "Guests wait 25% longer." },
};

export interface Choice {
  label: string;
  result: string;
  gold: number;
  trust: number;
  heat: number;
}

export interface LastCall {
  visitor: string;
  question: string;
  rumor: string;
  heard: Choice[];
  unheard: Choice[];
}

interface Arrival {
  at: number;
  kind: GuestKind;
  order: Item;
  rumor?: boolean;
}

export interface NightPlan {
  intro: string;
  guests: Arrival[];
  lastCall: LastCall;
}

const arrive = (at: number, kind: GuestKind, order: Item, rumor = false): Arrival => ({ at, kind, order, rumor });

export const NIGHTS: NightPlan[] = [
  {
    intro: "Night 1. Ale is at the bar, bread is in the basket on the crates. E to act, C to swap siblings.",
    guests: [
      arrive(3, "farmer", "ale"),
      arrive(10, "soldier", "ale"),
      arrive(17, "farmer", "bread"),
      arrive(25, "smuggler", "ale", true),
      arrive(33, "fugitive", "bread"),
      arrive(42, "soldier", "bread"),
    ],
    lastCall: {
      visitor: "The baron's tax collector",
      question: "Someone is running untaxed salt over this pass. Who have you heard talking?",
      rumor: "The smuggler muttered that the salt is hidden under the chapel floor.",
      heard: [
        { label: "Tell the truth: the chapel floor", result: "He smiles and writes it down. By morning the village knows who talked.", gold: 5, trust: -3, heat: -2 },
        { label: "Lie: send him to the empty quarry", result: "He leaves for the quarry. The smugglers quietly leave you a thank-you.", gold: 0, trust: 2, heat: 1 },
        { label: "Sell it: name your price", result: "He pays well and despises you for it.", gold: 25, trust: -2, heat: -1 },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "He doesn't believe you, and he makes a note of your name.", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays for your story. He will be back when it proves false.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
  {
    intro: "Night 2. Stew is on the menu. Start the pot at the fire early, and leave a sibling there so it won't burn.",
    guests: [
      arrive(2, "farmer", "stew"),
      arrive(7, "soldier", "ale"),
      arrive(12, "smuggler", "stew"),
      arrive(17, "farmer", "bread"),
      arrive(23, "fugitive", "stew", true),
      arrive(29, "soldier", "ale"),
      arrive(35, "farmer", "ale"),
      arrive(41, "smuggler", "bread"),
      arrive(48, "soldier", "stew"),
    ],
    lastCall: {
      visitor: "A bounty hunter",
      question: "I'm tracking a deserter from the baron's army. Did one come through tonight?",
      rumor: "The pale stranger whispered that they deserted and are heading for the border at dawn.",
      heard: [
        { label: "Tell the truth: the border, at dawn", result: "He rides out at once. Nobody speaks to you at the well the next day.", gold: 5, trust: -3, heat: -2 },
        { label: "Lie: point him back down the valley", result: "He rides the wrong way. Someone leaves flowers on your step.", gold: 0, trust: 2, heat: 1 },
        { label: "Sell it: name your price", result: "He counts the coins onto the bar without looking at you.", gold: 25, trust: -2, heat: -1 },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "He shrugs and tells you the baron hates a blind innkeeper.", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays you for it. He does not look like a forgiving man.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
  {
    intro: "Night 3. The last night before the baron collects. The road is busy, so keep both siblings working.",
    guests: [
      arrive(2, "soldier", "ale"),
      arrive(6, "farmer", "stew"),
      arrive(10, "smuggler", "ale"),
      arrive(15, "farmer", "bread", true),
      arrive(20, "soldier", "stew"),
      arrive(24, "fugitive", "ale"),
      arrive(29, "smuggler", "stew"),
      arrive(34, "farmer", "ale"),
      arrive(38, "soldier", "bread"),
      arrive(43, "fugitive", "stew"),
      arrive(48, "farmer", "bread"),
      arrive(54, "smuggler", "ale"),
    ],
    lastCall: {
      visitor: "The baron's captain",
      question: "The villagers are meeting in secret against my lord. Where?",
      rumor: "An old farmer said the village meets at the mill, the night after the debt falls due.",
      heard: [
        { label: "Tell the truth: the old mill", result: "Soldiers march for the mill before sunrise.", gold: 5, trust: -3, heat: -2 },
        { label: "Lie: the ruins on the north road", result: "The captain marches his men into the snow, away from the mill.", gold: 0, trust: 2, heat: 1 },
        { label: "Sell it: name your price", result: "He pays in the baron's own silver. It feels heavier than it should.", gold: 25, trust: -2, heat: -1 },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "\"Tomorrow,\" he says, \"you'll wish you had.\"", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays you and sends a rider to check.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
];

export const ENDINGS: Record<EndingId, { title: string; text: string }> = {
  arrested: {
    title: "Arrested",
    text: "The baron has heard enough about the tavern on the pass. Soldiers break down the door, and the two of you are marched away in irons.",
  },
  overthrow: {
    title: "The Village Rises",
    text: "When the baron comes to collect, the whole village is waiting at your door. He rides away with nothing, and the debt dies with his power on the pass.",
  },
  kept: {
    title: "Paid in Full",
    text: "You count the coins onto the bar and the baron takes them without a word. The tavern is yours. For now.",
  },
  lost: {
    title: "Foreclosed",
    text: "The money isn't there. The baron's men nail the door shut, and you walk down the mountain with what you can carry.",
  },
};

export interface Guest {
  id: number;
  kind: GuestKind;
  order: Item;
  seat: number;
  status: GuestStatus;
  patience: number;
  maxPatience: number;
  eatLeft: number;
  rumor: boolean;
  listened: number;
}

/** The state that lasts between nights. */
export interface TavernSave {
  nightIndex: number;
  gold: number;
  trust: number;
  heat: number;
  upgrades: UpgradeId[];
  tapLeft: number;
}

export interface TickContext {
  /** Station the sibling you are not controlling is standing at, if any. */
  helper: Station | null;
  /** Guest the sibling you are controlling is close enough to overhear. */
  listeningTo: number | null;
}

export interface Prompt {
  label: string;
  actionable: boolean;
}

interface Action {
  label: string;
  run?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const STATION_OF_ITEM: Record<Item, Station> = { ale: "tap", bread: "bread", stew: "pot", cask: "barrel" };

export class Tavern {
  phase: Phase = "service";
  nightIndex = 0;
  gold = 0;
  trust = START_TRUST;
  heat = 0;
  clock = 0;

  readonly guests: Guest[] = [];
  readonly carrying: [Item | null, Item | null] = [null, null];
  readonly upgrades = new Set<UpgradeId>();

  tapLeft = TAP_SIZE;
  aleReady = 0;
  pourLeft: number | null = null;
  potState: PotState = "empty";
  potTimer = 0;
  potBowls = 0;

  heardRumor = false;
  served = 0;
  walkouts = 0;
  earned = 0;
  lastResult = "";
  ending: EndingId | null = null;

  private nextArrival = 0;
  private nextGuestId = 1;
  private readonly messages: string[] = [];

  constructor(private readonly seatCount: number) {
    this.say(this.plan.intro);
  }

  get plan(): NightPlan {
    return NIGHTS[this.nightIndex];
  }

  get isLastNight(): boolean {
    return this.nightIndex === NIGHTS.length - 1;
  }

  get lastCallChoices(): Choice[] {
    return this.heardRumor ? this.plan.lastCall.heard : this.plan.lastCall.unheard;
  }

  /** Text waiting to be shown to the player. Reading it empties the queue. */
  takeMessages(): string[] {
    return this.messages.splice(0);
  }

  private say(text: string): void {
    this.messages.push(text);
  }

  private adjust(gold: number, trust: number, heat: number): void {
    this.gold = Math.max(0, this.gold + gold);
    this.trust = clamp(this.trust + trust, 0, TRUST_MAX);
    this.heat = clamp(this.heat + heat, 0, HEAT_MAX);
  }

  private freeSeat(): number | null {
    const taken = new Set(this.guests.filter((g) => g.status !== "leaving").map((g) => g.seat));
    // Stepping by 5 spreads guests around the room instead of filling it in order.
    for (let i = 0; i < this.seatCount; i++) {
      const seat = (this.nextGuestId * 5 + i) % this.seatCount;
      if (!taken.has(seat)) return seat;
    }
    return null;
  }

  private spawnArrivals(): void {
    const arrivals = this.plan.guests;
    while (this.nextArrival < arrivals.length && arrivals[this.nextArrival].at <= this.clock) {
      const seat = this.freeSeat();
      if (seat === null) return; // Tries again next tick, once someone leaves.
      const { kind, order, rumor } = arrivals[this.nextArrival++];
      const maxPatience = GUEST_KINDS[kind].patience * (this.upgrades.has("cushions") ? CUSHION_PATIENCE : 1);
      this.guests.push({
        id: this.nextGuestId++,
        kind,
        order,
        seat,
        status: "arriving",
        patience: maxPatience,
        maxPatience,
        eatLeft: rumor ? RUMOR_EAT_TIME : EAT_TIME,
        rumor: Boolean(rumor),
        listened: 0,
      });
    }
  }

  private startPour(): void {
    this.tapLeft--;
    this.pourLeft = this.upgrades.has("quicktap") ? QUICK_POUR_TIME : POUR_TIME;
  }

  private startStew(): void {
    this.potState = "cooking";
    this.potTimer = STEW_TIME;
  }

  private updateTap(dt: number, helper: Station | null): void {
    if (this.pourLeft !== null) {
      this.pourLeft -= dt;
      if (this.pourLeft <= 0) {
        this.pourLeft = null;
        this.aleReady++;
      }
    }
    if (helper === "tap" && this.pourLeft === null && this.aleReady < ALE_SHELF && this.tapLeft > 0) {
      this.startPour();
    }
  }

  private updatePot(dt: number, helper: Station | null): void {
    const tending = helper === "pot";
    if (this.potState === "cooking") {
      this.potTimer -= dt * (tending ? HELPER_COOK_SPEED : 1);
      if (this.potTimer <= 0) {
        this.potState = "ready";
        this.potTimer = BURN_TIME;
        this.potBowls = this.upgrades.has("bigpot") ? BIG_POT_BOWLS : POT_BOWLS;
        this.say("The stew is ready.");
      }
    } else if (this.potState === "ready" && !tending) {
      this.potTimer -= dt;
      if (this.potTimer <= 0) {
        this.potState = "burnt";
        this.potBowls = 0;
        this.say("The stew has burnt!");
      }
    } else if (tending && this.potState === "burnt") {
      this.potState = "empty";
    } else if (tending && this.potState === "empty") {
      this.startStew();
    }
  }

  private updateGuests(dt: number, listeningTo: number | null): void {
    for (const guest of this.guests) {
      if (guest.status === "waiting") {
        guest.patience -= dt;
        if (guest.patience <= 0) this.walkOut(guest);
      } else if (guest.status === "eating") {
        guest.eatLeft -= dt;
        if (guest.eatLeft <= 0) guest.status = "leaving";
      }

      const seated = guest.status === "waiting" || guest.status === "eating";
      if (seated && guest.rumor && !this.heardRumor && guest.id === listeningTo) {
        guest.listened += dt;
        if (guest.listened >= LISTEN_TIME) {
          this.heardRumor = true;
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
        }
      }
    }
  }

  private walkOut(guest: Guest): void {
    guest.status = "leaving";
    this.walkouts++;
    this.adjust(0, -1, GUEST_KINDS[guest.kind].walkoutHeat);
    this.say(`A ${guest.kind} walked out without paying.`);
  }

  tick(dt: number, context: TickContext): void {
    if (this.phase !== "service") return;
    this.clock += dt;
    this.spawnArrivals();
    this.updateTap(dt, context.helper);
    this.updatePot(dt, context.helper);
    this.updateGuests(dt, context.listeningTo);

    if (this.nextArrival === this.plan.guests.length && this.guests.length === 0) {
      this.phase = "lastcall";
    }
  }

  guestArrived(id: number): void {
    const guest = this.guests.find((g) => g.id === id);
    if (guest?.status === "arriving") guest.status = "waiting";
  }

  guestLeft(id: number): void {
    const index = this.guests.findIndex((g) => g.id === id);
    if (index >= 0) this.guests.splice(index, 1);
  }

  private serve(guest: Guest, sibling: number): void {
    const rules = GUEST_KINDS[guest.kind];
    const tipped = guest.patience / guest.maxPatience > TIP_THRESHOLD;
    const amount = rules.pay + (tipped ? rules.tip : 0);
    this.carrying[sibling] = null;
    guest.status = "eating";
    this.served++;
    this.earned += amount;
    this.adjust(amount, rules.trust, 0);
    this.say(tipped ? `+${amount} gold, with a tip.` : `+${amount} gold.`);
  }

  private stationAction(station: Station, sibling: number): Action | null {
    const held = this.carrying[sibling];
    const take = (item: Item) => { this.carrying[sibling] = item; };
    const drop = () => { this.carrying[sibling] = null; };

    if (held && STATION_OF_ITEM[held] === station) {
      return {
        label: `Put ${held} back`,
        run: () => {
          drop();
          if (held === "ale") this.aleReady++;
          if (held === "stew") {
            this.potBowls++;
            if (this.potState !== "ready") {
              this.potState = "ready";
              this.potTimer = BURN_TIME;
            }
          }
        },
      };
    }

    if (station === "tap") {
      if (held === "cask") {
        return { label: "Refill the tap", run: () => { drop(); this.tapLeft = TAP_SIZE; } };
      }
      if (held) return null;
      if (this.aleReady > 0) return { label: "Take ale", run: () => { this.aleReady--; take("ale"); } };
      if (this.pourLeft !== null) return { label: "Pouring..." };
      if (this.tapLeft === 0) return { label: "Tap is empty. Bring a cask from the barrels" };
      return { label: "Pour ale", run: () => this.startPour() };
    }

    if (held) return null;

    if (station === "bread") return { label: "Take bread", run: () => take("bread") };
    if (station === "barrel") return { label: "Take a cask", run: () => take("cask") };

    switch (this.potState) {
      case "empty":
        return { label: "Start the stew", run: () => this.startStew() };
      case "cooking":
        return { label: "Stew is cooking..." };
      case "burnt":
        return { label: "Scrape out the burnt pot", run: () => { this.potState = "empty"; } };
      case "ready":
        return {
          label: `Take stew (${this.potBowls} left)`,
          run: () => {
            take("stew");
            this.potBowls--;
            if (this.potBowls === 0) this.potState = "empty";
          },
        };
    }
  }

  private action(sibling: number, target: Target): Action | null {
    if (this.phase !== "service") return null;
    if (target.kind === "station") return this.stationAction(target.station, sibling);

    const guest = this.guests.find((g) => g.id === target.id);
    if (guest?.status !== "waiting" || this.carrying[sibling] !== guest.order) return null;
    return { label: `Serve ${guest.order}`, run: () => this.serve(guest, sibling) };
  }

  prompt(sibling: number, target: Target): Prompt | null {
    const action = this.action(sibling, target);
    return action && { label: action.label, actionable: Boolean(action.run) };
  }

  interact(sibling: number, target: Target): void {
    this.action(sibling, target)?.run?.();
  }

  chooseLastCall(index: number): void {
    if (this.phase !== "lastcall") return;
    const choice = this.lastCallChoices[index];
    if (!choice) return;
    this.adjust(choice.gold, choice.trust, choice.heat);
    this.lastResult = choice.result;
    this.phase = "dawn";
  }

  canBuy(id: UpgradeId): boolean {
    return this.phase === "dawn" && !this.upgrades.has(id) && this.gold >= UPGRADE_COST;
  }

  buy(id: UpgradeId): void {
    if (!this.canBuy(id)) return;
    this.gold -= UPGRADE_COST;
    this.upgrades.add(id);
  }

  private decideEnding(): EndingId {
    if (this.heat >= HEAT_MAX) return "arrested";
    if (this.trust >= TRUST_TO_OVERTHROW) return "overthrow";
    return this.gold >= DEBT ? "kept" : "lost";
  }

  nextNight(): void {
    if (this.phase !== "dawn") return;
    if (this.isLastNight) {
      this.ending = this.decideEnding();
      this.phase = "ended";
      return;
    }
    this.nightIndex++;
    this.openNight();
  }

  /** What carries from one night to the next, taken as a night opens. A save holds this. */
  snapshot(): TavernSave {
    return {
      nightIndex: this.nightIndex,
      gold: this.gold,
      trust: this.trust,
      heat: this.heat,
      upgrades: [...this.upgrades],
      tapLeft: this.tapLeft,
    };
  }

  /** Puts the tavern back at the start of a saved night, with no guests yet. */
  restore(save: TavernSave): void {
    this.nightIndex = save.nightIndex;
    this.gold = save.gold;
    this.trust = save.trust;
    this.heat = save.heat;
    this.upgrades.clear();
    for (const id of save.upgrades) this.upgrades.add(id);
    this.tapLeft = save.tapLeft;
    this.guests.length = 0;
    this.nextGuestId = 1;
    this.messages.length = 0;
    this.lastResult = "";
    this.ending = null;
    this.openNight();
  }

  /** Clears everything that only lasts one night, and announces the night. */
  private openNight(): void {
    this.phase = "service";
    this.clock = 0;
    this.nextArrival = 0;
    this.carrying[0] = this.carrying[1] = null;
    this.aleReady = 0;
    this.pourLeft = null;
    this.potState = "empty";
    this.potBowls = 0;
    this.heardRumor = false;
    this.served = 0;
    this.walkouts = 0;
    this.earned = 0;
    this.say(this.plan.intro);
  }
}
