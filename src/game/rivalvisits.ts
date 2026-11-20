/**
 * The rival houses by day (TOWN_DAY.md step 4): the Village Ledger's fight (STORY.md section 7, "Tarven first")
 * played out in town instead of only on the morning card. Each of Tarven's five houses can be visited while it
 * still stands above her:
 *
 * - **Scout it:** a drink at its bar, how it wins its fans, and its count against hers.
 * - **Beat it fairly:** steal the idea (STORY.md's "Beat it fairly" column). Only once she's scouted it, so she
 *   knows what the idea is. A few fans and guests tonight, and the village likes her for it.
 * - **Beat it dirty:** STORY.md's "Beat it dirty" column, kept funny, not cruel (a drunk tax-taster, salt in the
 *   sugar bin). Twice the fans, but it costs corruption and a little of her good name.
 *
 * Once a house falls (its boss came in at dawn), the fight is over: a partner pours her a drink, a ruined house is
 * shut. Pure data, read by townplaces.ts.
 */
import { HOUSE_BY_ID, type HouseId } from "./ledger";
import type { TownAction, TownOutcome, TownPlaceId, TownState } from "./townplaces";

/** What a fair move brings, and a dirty one (twice the fans, at a price). */
export const FAIR = { fans: 4, guests: 2 } as const;
export const DIRTY = { fans: 8, guests: 2, corruption: 5, kindness: -1 } as const;

interface Move {
  label: string;
  hours: number;
  cost?: number;
  lines: readonly string[];
  /** What else it does, on top of FAIR or DIRTY. */
  extra?: Omit<TownOutcome, "line">;
  /** Why she can't, beyond the house having fallen. */
  locked?: (s: TownState) => string | null;
}

interface RivalPlan {
  house: HouseId;
  /** Where in town it is. */
  place: TownPlaceId;
  scout: Move;
  fair: Move;
  dirty: Move;
  /** What its boss says over a drink, once they're her partner. */
  partner: readonly string[];
  /** What she finds once she's ruined it. */
  ruined: string;
}

export const RIVAL_PLANS: Readonly<Record<HouseId, RivalPlan>> = {
  cider: {
    house: "cider",
    place: "ciderbarn",
    scout: {
      label: "Size up Hollin's barn (1 gold for a cup)",
      hours: 0.5,
      cost: 1,
      lines: [
        "Hay bales, chickens and twenty farmers on credit. Hollin writes every cup in his little book and nobody ever pays it off. The cider's good. The bookkeeping is a hostage situation.",
        "You count heads over a cup: farmers, mostly, and a goat that seems to be a regular. They come for the tab, not the drink.",
      ],
    },
    fair: {
      label: "Let the farmers run a tab at yours too",
      hours: 0.5,
      lines: [
        "You tell the long bench they can drink on tick at yours, and you won't charge interest like Hollin does. Hollin pretends not to hear. Three farmers pretend not to be pleased.",
      ],
      extra: { trust: 1 },
    },
    dirty: {
      label: "Tell Pell's clerk Hollin's cider is untaxed",
      hours: 0.5,
      lines: [
        "One word to Pell's clerk. By afternoon a man with a measuring jug is in Hollin's barn, tasting every barrel \"for the Baron.\" He's very thorough. He's very drunk. Hollin's farmers drink at yours tonight, out of spite.",
      ],
      extra: { heat: 1, trust: -1 },
    },
    partner: [
      "Hollin pours you a cup from the good barrel, the one he doesn't write down. \"Partners,\" he says, and crosses something out of his little book. You don't ask what.",
      "Hollin's farmers wave you over to the hay bales. \"Hers is on the house,\" Hollin tells them. \"Don't get used to it.\"",
    ],
    ruined: "Hollin's barn is shut, a chain across the door. A chicken sits on the step, waiting for a tab that isn't coming.",
  },
  bakehouse: {
    house: "bakehouse",
    place: "bakehouse",
    scout: {
      label: "Buy a pie and size up the long table (1 gold)",
      hours: 0.5,
      cost: 1,
      lines: [
        "The pie is perfect, and you hate that. The long table seats thirty and Tansy remembers every one of their birthdays. That's the trick: they come to be known.",
        "You eat slowly and watch. Tansy's crust is lard and a pinch of something she won't name. The gossip comes free with every slice.",
      ],
    },
    fair: {
      label: "Trade Grandma's stew secret for a look at Tansy's crust",
      hours: 1,
      lines: [
        "You swap Grandma's stew secret for a look at Tansy's crust. It's a fair trade, and you both know who won. Your stew's better tonight, and the long table hears about it.",
      ],
      extra: { kindness: 1 },
    },
    dirty: {
      label: "Swap Tansy's sugar for salt",
      hours: 0.5,
      lines: [
        "A sack of salt in the sugar bin. By noon the whole long table is spitting out plum tarts and Tansy is chasing the miller's boys round the square with a rolling pin. Somebody suggests your place. You don't argue.",
      ],
      extra: { respect: -1 },
    },
    partner: [
      "Tansy cuts you the first slice, which she does for nobody. \"Partners,\" she says. \"You still owe me that stew recipe. All of it this time.\"",
      "Tansy slides a pie across the long table to you. \"For your bar. And for your grandmother. She liked the cherry.\"",
    ],
    ruined: "The Bakehouse ovens are cold. Somebody has chalked \"SALT\" on the door, and somebody else has chalked \"WE KNOW\" under it.",
  },
  canteen: {
    house: "canteen",
    place: "garrison",
    scout: {
      label: "Drink at Pike's Watch Canteen (1 gold)",
      hours: 0.5,
      cost: 1,
      lines: [
        "Bad ale, loud songs, and soldiers who'd rather be anywhere else. Pike runs it like a drill: drink, sing, bed. They'd follow a better brawl anywhere.",
        "Pike watches you over his moustache the whole time. His lads don't come for the ale. They come because there's nowhere else to fight on a Friday.",
      ],
    },
    fair: {
      label: "Challenge Pike's lads to arm-wrestle at your bar tonight",
      hours: 0.5,
      lines: [
        "You slap a hand on the canteen table: arm-wrestling at your bar tonight, winner drinks free. Pike laughs. Half his lads don't. They'll be there.",
      ],
      extra: { fame: 1, guests: 3 },
    },
    dirty: {
      label: "Tell Captain Rhea that Pike sells the garrison's ale",
      hours: 0.5,
      lines: [
        "You mention to Captain Rhea, very innocently, that the canteen's ale tastes a lot like the garrison's own stores. Pike spends the afternoon counting barrels with Rhea standing over him. His lads drink at yours tonight, to get away from the shouting.",
      ],
      extra: { heat: -1 },
    },
    partner: [
      "Pike pushes a tankard at you across the canteen table. \"Partners. My lads drink at yours, yours fight at mine. Fair?\" It's the warmest thing he's ever said.",
      "\"Innkeeper!\" Pike's lads bang the table when you walk in. Pike rolls his eyes, and pours you one anyway.",
    ],
    ruined: "The Watch Canteen is boarded up. The garrison drinks at yours now, or not at all. Pike glares at you from the drill yard.",
  },
  tollgate: {
    house: "tollgate",
    place: "tollgate",
    scout: {
      label: "Take tea in Agnes Crale's parlour (1 gold)",
      hours: 0.5,
      cost: 1,
      lines: [
        "Clean beds, weak tea, and a register by the door that every traveller signs. Agnes reads it twice. Folk on the run don't stay long here.",
        "The parlour is spotless and very quiet. A traveller leans over and asks you, low, if there's anywhere in town that doesn't write names down.",
      ],
    },
    fair: {
      label: "Promise travellers a bed nobody writes down",
      hours: 0.5,
      lines: [
        "You leave word at the gate: a warm bed at yours, no names, no questions. A pedlar and two very nervous \"cousins\" ask after your rooms before you're even home.",
      ],
      extra: { trust: 1 },
    },
    dirty: {
      label: "Tell Agnes's guests where her register goes",
      hours: 0.5,
      lines: [
        "You lean over the parlour's breakfast table and mention, very kindly, where Agnes's register goes every Friday. The parlour empties by noon. Agnes's spectacles fog up with rage.",
      ],
      extra: { heat: 1 },
    },
    partner: [
      "Agnes pours you tea and, for once, closes the register. \"Partners. I'll send you the ones who'd rather not be written down.\" She almost smiles.",
      "Agnes nods you into the parlour. \"A quiet week,\" she says. \"I haven't written to Pell once.\" That, from her, is a love letter.",
    ],
    ruined: "The Toll-Gate Inn is dark, its sheets folded away. The register is gone. Somebody, probably Pell, is very annoyed about that.",
  },
  copperBell: {
    house: "copperBell",
    place: "copperbell",
    scout: {
      label: "Buy a drink and scout the room (2 gold)",
      hours: 0.5,
      cost: 2,
      lines: [
        "You nurse a cider and watch. Jory pours fast, waters the ale, and lets his regulars run a tab. You'll steal the fast pouring.",
        "Two-for-One Thursdays, a bard who only knows three songs, and a cook who's actually good. You leave with ideas, and a few of his regulars ask where your place is.",
      ],
    },
    fair: {
      label: "Stand Silas's crew a round and win them over (3 gold)",
      hours: 1,
      cost: 3,
      lines: [
        "You stand Silas's crew a round in Jory's own back corner and laugh at their jokes. They're terrible jokes. By the end they're talking about moving their Thursday dice game to your place.",
      ],
      locked: (s) => (s.flags.has("silasAngry") ? "Silas's crew won't drink with you" : null),
    },
    dirty: {
      label: "Whisper that Jory waters his ale",
      hours: 0.5,
      lines: [
        "A word at the bar, a word at the door. By noon half the square \"always knew\" Jory watered his ale. It's true, which almost makes it worse. A few of his drinkers will try yours tonight.",
      ],
    },
    partner: [
      "Jory pours you the unwatered stuff from under the bar. \"Partners. Don't tell the regulars it exists.\"",
      "Jory taps his copper bell pin at you across the room and sends over a drink. Half friend, half rival, all business.",
    ],
    ruined: "The Copper Bell is shut, its bell taken down from the door. Jory's back room is empty. Whatever Pell kept in there, he's moved it.",
  },
};

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length) % list.length];

/** How she stands against a house: its fans against hers, and how far she has to go. */
export function standing(house: HouseId, fans: number): string {
  const h = HOUSE_BY_ID.get(house)!;
  return fans > h.fans
    ? `${h.name} has ${h.fans} fans to your ${fans}: you've passed it, and ${h.boss} knows it.`
    : `${h.name} has ${h.fans} fans to your ${fans}. ${h.fans + 1 - fans} more and you pass it.`;
}

/** The house is out of the fight: it fell, and its boss came in at dawn. */
const fallen = (house: HouseId) => (s: TownState) => (s.houses[house] ? "you've already beaten it" : null);
/** She's scouted it, so she knows what to steal. */
const scouted = (house: HouseId, place: TownPlaceId) => (s: TownState) => ((s.done[`${place}:scout_${house}`] ?? 0) > 0 ? null : "scout it first");
const either = (...checks: ((s: TownState) => string | null)[]) => (s: TownState) => checks.reduce<string | null>((why, check) => why ?? check(s), null);

/** A house's actions in town: the fight while it stands, then a drink with its boss if she made it her partner. */
export function rivalActions(house: HouseId): TownAction[] {
  const plan = RIVAL_PLANS[house];
  const { scout, fair, dirty } = plan;
  return [
    {
      id: `scout_${house}`,
      label: scout.label,
      hours: scout.hours,
      cost: scout.cost,
      locked: fallen(house),
      run: (s, rng) => ({ line: `${pick(scout.lines, rng)} ${standing(house, s.fans)}`, guests: 1 }),
    },
    {
      id: `fair_${house}`,
      label: fair.label,
      hours: fair.hours,
      cost: fair.cost,
      locked: either(fallen(house), scouted(house, plan.place), fair.locked ?? (() => null)),
      run: (_s, rng) => ({ ...FAIR, ...fair.extra, line: pick(fair.lines, rng) }),
    },
    {
      id: `dirty_${house}`,
      label: dirty.label,
      hours: dirty.hours,
      cost: dirty.cost,
      locked: either(fallen(house), dirty.locked ?? (() => null)),
      run: (_s, rng) => ({ ...DIRTY, ...dirty.extra, line: pick(dirty.lines, rng) }),
    },
    {
      id: `partner_${house}`,
      label: `Have a drink with ${HOUSE_BY_ID.get(house)!.boss}`,
      hours: 0.5,
      locked: (s) => (s.houses[house] === "partner" ? null : "only once you're partners"),
      run: (_s, rng) => ({ line: pick(plan.partner, rng), fans: 1, kindness: 1 }),
    },
  ];
}

/** What she finds at a house she's ruined, or null while it's open. */
export function ruinedLine(house: HouseId, s: TownState): string | null {
  return s.houses[house] === "ruin" ? RIVAL_PLANS[house].ruined : null;
}
