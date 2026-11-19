/**
 * The Revel House (REVEL_HOUSE.md): a late-game way to run the tavern. On a night she chooses by day in House Plans,
 * the hall is the pass's notorious revel house, and the guests come for the orgy, not the stew. Pure rules, kept apart
 * from tavern.ts so they can be tested: who comes through the door (`revelGuests`), how the room pairs off and groups
 * up over the night as a background scene (`revelNight`), how many are in her centrepiece (`centrepieceCrowd`), and
 * what the night is worth at dawn (`revelDawn`). Nothing here draws or talks yet: the hall, the group poses and the
 * lines in the house voice are still to come (POSES_TODO.md), so the few lines below are plain placeholders.
 *
 * The consent rule holds all night, as everywhere (GAME_PATH.MD):
 * - **Coming through the door is the guest's yes.** A revel night is announced, and every guest who walks in has
 *   come for it, so the room doesn't stop to ask each one: groups just form. Anyone can still stop or walk out, and a
 *   no ends it for them (`revelNight` counts both).
 * - **Staff choose whether to work it**, each for themselves (STAFF.md); nobody is put on the floor.
 * - **The heroine** follows the consent rule in GAME_PATH.MD: with Consent on she's asked at every step and Stop
 *   always works; with Consent off, its Consent-off rules.
 * - **Never anyone passed out or roaring drunk**: the door turns the roaring drunk away, and nobody in the room is
 *   let drink that far. Every guest, every member of staff and she herself is an adult (18+), and never anything
 *   childlike.
 */
import { crowdFactor, type DefeatId } from "./defeat";
import { GUEST_KIND_LIST } from "./guestroles";
import { MIND_AT } from "./lewd";
import { pickLog, seedRoll } from "./loglines";
import type { GuestKind } from "./tavern";

/** A roll 0 to 1, as `Math.random` gives. */
export type Rng = () => number;

// ---------- The night's settings ----------

/** Who's invited: mostly men (the gangbang night), mixed (the orgy night), or women only. */
export type RevelWho = "men" | "mixed" | "women";
/** Her part: hosting (she runs the room), joining in, or the centrepiece (it's about her). */
export type RevelPart = "host" | "join" | "centrepiece";
/** The door: open to all, by invitation (regulars and fans only), or paying (a fee at the door). */
export type RevelDoor = "open" | "invite" | "paying";

/** What she sets in House Plans by day, the same way as the Lantern's lit or dark switch. */
export interface RevelSettings {
  who: RevelWho;
  herPart: RevelPart;
  door: RevelDoor;
}

/** Where a first revel night starts, before she changes anything. */
export const DEFAULT_REVEL: Readonly<RevelSettings> = { who: "mixed", herPart: "host", door: "open" };

// ---------- When it opens ----------

/**
 * Late game, act 3. Her lewdness is at the filthy stage (Known) or her corruption is crooked, the table scene has
 * happened often enough (ten table scenes, or thirty partners in all), and the house has the room for it: the Revel
 * Hall, a House Plans build made from the taproom with cushions and the big table.
 */
export const REVEL_UNLOCK = {
  lewdness: MIND_AT[2],
  corruption: 80,
  tableScenes: 10,
  partners: 30,
  build: "revelHall",
} as const;

/** What the tavern knows that decides whether the Revel House is open to her. */
export interface RevelFacts {
  lewdness: number;
  corruption: number;
  /** Table scenes she's had (taproom.ts), and partners in all. */
  tableScenes: number;
  taproomPartners: number;
  /** House Plans builds she has (ids). */
  builds: readonly string[];
}

/** Whether she can choose a revel night. */
export function revelUnlocked(f: RevelFacts): boolean {
  const far = f.lewdness >= REVEL_UNLOCK.lewdness || f.corruption >= REVEL_UNLOCK.corruption;
  const used = f.tableScenes >= REVEL_UNLOCK.tableScenes || f.taproomPartners >= REVEL_UNLOCK.partners;
  return far && used && f.builds.includes(REVEL_UNLOCK.build);
}

// ---------- Who comes through the door ----------

/** One guest at the revel. Everyone here is an adult who came for it. */
export interface RevelGuest {
  kind: GuestKind;
  female: boolean;
}

export interface RevelGuestMix {
  guests: RevelGuest[];
  men: number;
  women: number;
  /** The share of the room that's women, 0 to 1. */
  shareFemale: number;
  /** Turned away at the door, roaring drunk (the consent rule). */
  turnedAway: number;
}

/** How many come, [least, most], by the door. Open draws the pass; invitations keep it to regulars and fans. */
export const REVEL_COUNT: Record<RevelDoor, readonly [number, number]> = {
  open: [14, 20],
  invite: [8, 12],
  paying: [10, 15],
};

/** The share of women in the room, by who's invited. "Mostly men" still lets a few women in. */
export const REVEL_FEMALE: Record<RevelWho, number> = { men: 0.1, mixed: 0.5, women: 1 };

/** The chance each one at the door is roaring drunk and turned away. */
export const TURNED_AWAY_CHANCE = 0.08;

/**
 * Who the door draws, by weight per kind. Open, the rough end of the pass comes; paying, those with a purse;
 * invitations, every kind she's served, evenly.
 */
export const REVEL_KIND_WEIGHT: Record<RevelDoor, Record<GuestKind, number>> = {
  open: { farmer: 3, smuggler: 2, soldier: 3, fugitive: 2, adventurer: 2, bandit: 3, noble: 1 },
  invite: { farmer: 1, smuggler: 1, soldier: 1, fugitive: 1, adventurer: 1, bandit: 1, noble: 1 },
  paying: { farmer: 1, smuggler: 2, soldier: 2, fugitive: 1, adventurer: 3, bandit: 1, noble: 3 },
};

/** A kind, by weight, from a roll. */
function pickKind(door: RevelDoor, roll: number): GuestKind {
  const w = REVEL_KIND_WEIGHT[door];
  const total = GUEST_KIND_LIST.reduce((s, k) => s + w[k], 0);
  let at = roll * total;
  for (const k of GUEST_KIND_LIST) {
    at -= w[k];
    if (at < 0) return k;
  }
  return GUEST_KIND_LIST[GUEST_KIND_LIST.length - 1];
}

/**
 * The guests on a revel night: how many come (by the door), how many are women (by who's invited; women only means
 * every one), and which kinds. The roaring drunk are turned away at the door and don't count among them.
 */
export function revelGuests(s: RevelSettings, rng: Rng): RevelGuestMix {
  const [least, most] = REVEL_COUNT[s.door];
  const arrive = least + Math.floor(rng() * (most - least + 1));
  const share = REVEL_FEMALE[s.who];
  const guests: RevelGuest[] = [];
  let turnedAway = 0;
  for (let i = 0; i < arrive; i++) {
    if (rng() < TURNED_AWAY_CHANCE) {
      turnedAway++;
      continue;
    }
    const female = share >= 1 ? true : share <= 0 ? false : rng() < share;
    guests.push({ kind: pickKind(s.door, rng()), female });
  }
  const women = guests.filter((g) => g.female).length;
  return { guests, men: guests.length - women, women, shareFemale: guests.length ? women / guests.length : 0, turnedAway };
}

// ---------- The night ----------

/** The night in hours, from the doors opening to the last group finishing. */
export const REVEL_HOURS = 6;
/** How big a group is, and how likely each size is. */
export const GROUP_SIZE_WEIGHT: Readonly<Record<2 | 3 | 4, number>> = { 2: 5, 3: 3, 4: 2 };
/** The most groups any one guest joins in a night before they're spent. */
export const GROUPS_EACH = 2;
/** The chance each hour that a free guest joins a group, rather than drinking and watching. */
export const JOIN_CHANCE = 0.6;
/** The chance a group is stopped early by one of its own (a no ends it), and a free guest walks out each hour. */
export const STOP_CHANCE = 0.06;
export const WALKOUT_CHANCE = 0.03;
/** The share of the room that wants her, by her part. */
export const WANT_HER: Record<RevelPart, number> = { host: 0.15, join: 0.35, centrepiece: 0.7 };

/** A background group: two, three or four of the guests, by index into the guest list. */
export interface RevelGroup {
  members: number[];
  men: number;
  women: number;
  /** The hour it formed, and the hour it finished. */
  from: number;
  to: number;
  /** One of them said stop, and it ended there. */
  stopped: boolean;
}

export interface RevelNightResult {
  groups: RevelGroup[];
  /** The room's heat by the hour, and at its height, 0 to 100. */
  heatByHour: number[];
  heat: number;
  /** Who wants her, for her scenes: how many men and women. */
  wantHer: { men: number; women: number };
  /** Guests who walked out during the night (anyone can). */
  walkedOut: number;
  /** Groups that someone stopped. */
  stops: number;
}

function pickSize(rng: Rng): 2 | 3 | 4 {
  const total = GROUP_SIZE_WEIGHT[2] + GROUP_SIZE_WEIGHT[3] + GROUP_SIZE_WEIGHT[4];
  let at = rng() * total;
  for (const n of [2, 3, 4] as const) {
    at -= GROUP_SIZE_WEIGHT[n];
    if (at < 0) return n;
  }
  return 4;
}

/**
 * The night as a background scene: the room pairs off and groups up on its own, hour by hour. Each hour, the free
 * guests who want to join form groups of two, three or four; a group lasts an hour or two, and its members are free
 * again after (each joins at most GROUPS_EACH). On a mostly-men night the few women are spread across the groups;
 * a mixed night mixes them as they come; women only is all women. Anyone may stop a group or walk out. The share
 * of the room set on her (by her part) are kept apart for her own scenes and counted in `wantHer`.
 */
export function revelNight(s: RevelSettings, mix: RevelGuestMix, rng: Rng): RevelNightResult {
  const n = mix.guests.length;
  const wantShare = WANT_HER[s.herPart];
  const forHer = new Set<number>();
  for (let i = 0; i < n; i++) if (rng() < wantShare) forHer.add(i);
  const wantHer = { men: 0, women: 0 };
  for (const i of forHer) {
    if (mix.guests[i].female) wantHer.women++;
    else wantHer.men++;
  }

  const joined = new Array<number>(n).fill(0);
  const busyUntil = new Array<number>(n).fill(0);
  const gone = new Set<number>();
  const groups: RevelGroup[] = [];
  const heatByHour: number[] = [];
  let heat = 0;
  let walkedOut = 0;
  let stops = 0;

  for (let hour = 0; hour < REVEL_HOURS; hour++) {
    // The free: here, not spent, not in a group, not waiting on her.
    const free: number[] = [];
    for (let i = 0; i < n; i++) {
      if (gone.has(i) || forHer.has(i) || busyUntil[i] > hour || joined[i] >= GROUPS_EACH) continue;
      if (rng() < WALKOUT_CHANCE) {
        gone.add(i);
        walkedOut++;
        continue;
      }
      if (rng() < JOIN_CHANCE) free.push(i);
    }
    // Shuffle, then spread the women first so a mostly-men night's few women each anchor a group.
    for (let i = free.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [free[i], free[j]] = [free[j], free[i]];
    }
    const women = free.filter((i) => mix.guests[i].female);
    const men = free.filter((i) => !mix.guests[i].female);
    const pool = s.who === "men" ? [...women, ...men] : free;
    const anchors = s.who === "men" ? women.length : 0;
    let made = 0;
    while (pool.length >= 2) {
      const size = Math.min(pickSize(rng), pool.length) as 2 | 3 | 4;
      let members: number[];
      if (made < anchors) {
        // One woman, and the rest men, while the women last.
        const w = pool.splice(pool.indexOf(women[made]), 1);
        const rest = pool.filter((i) => !mix.guests[i].female).slice(0, size - 1);
        for (const r of rest) pool.splice(pool.indexOf(r), 1);
        members = [...w, ...rest];
        if (members.length < 2) {
          pool.push(...members);
          break;
        }
      } else {
        members = pool.splice(0, size);
      }
      made++;
      const stopped = rng() < STOP_CHANCE;
      const to = hour + (stopped ? 1 : 1 + Math.floor(rng() * 2));
      const f = members.filter((i) => mix.guests[i].female).length;
      groups.push({ members, men: members.length - f, women: f, from: hour, to, stopped });
      if (stopped) stops++;
      for (const m of members) {
        joined[m]++;
        busyUntil[m] = to;
      }
    }
    // The room's heat: everyone at it now warms it; it cools a little each hour.
    const active = groups.filter((g) => g.from <= hour && g.to > hour).reduce((sum, g) => sum + g.members.length, 0);
    heat = Math.max(0, Math.min(100, Math.round(heat * 0.8 + (n ? (active / n) * 60 : 0) + forHer.size * 2)));
    heatByHour.push(heat);
  }
  return { groups, heatByHour, heat: Math.max(0, ...heatByHour), wantHer, walkedOut, stops };
}

// ---------- The centrepiece ----------

/** How many more the centrepiece holds than a defeat's crowd, by her part: it's chosen, not lost. */
export const CENTREPIECE_EXTRA: Record<RevelPart, number> = { host: 0, join: 1, centrepiece: 4 };
/** The most in her centrepiece, however many want her. */
export const CENTREPIECE_MAX = 12;
/** Which defeat's crowd rule the centrepiece goes by: the taproom floor's, as it's in the hall. */
export const CENTREPIECE_AS: DefeatId = "taproom";

export interface RevelCrowd {
  total: number;
  men: number;
  women: number;
}

/**
 * The night's big scene with her: as many as her records say (`crowdFactor` from defeat.ts, the taproom floor's
 * rule), more for the part she's chosen, and never more than want her. On a mixed or women's night the women who
 * want her take their share of the places. She's asked as the consent rule says; Stop always works with Consent on.
 */
export function centrepieceCrowd(
  records: { taproomPartners: number; fightsLost: number; defeats?: Partial<Record<DefeatId, number>> },
  s: RevelSettings,
  wantHer: { men: number; women: number },
): RevelCrowd {
  const want = wantHer.men + wantHer.women;
  const total = Math.min(want, CENTREPIECE_MAX, crowdFactor(records, CENTREPIECE_AS) + CENTREPIECE_EXTRA[s.herPart]);
  if (total <= 0) return { total: 0, men: 0, women: 0 };
  const women = Math.min(wantHer.women, Math.round((total * wantHer.women) / want));
  const men = Math.min(wantHer.men, total - women);
  return { total: men + women, men, women };
}

// ---------- Dawn ----------

/** The door fee a head on a paying night; the drinks a head, more from regulars on an invited night. */
export const DOOR_FEE = 5;
export const DRINKS_EACH: Record<RevelDoor, number> = { open: 2, invite: 3, paying: 2 };
/** Fame, respect and heat by the door; her part adds to fame and takes from respect. */
export const REVEL_FAME: Record<RevelDoor, number> = { open: 4, invite: 2, paying: 3 };
export const REVEL_RESPECT: Record<RevelDoor, number> = { open: -3, invite: -1, paying: -2 };
export const REVEL_HEAT: Record<RevelDoor, number> = { open: 2, invite: 1, paying: 1 };
export const PART_FAME: Record<RevelPart, number> = { host: 0, join: 1, centrepiece: 3 };
export const PART_RESPECT: Record<RevelPart, number> = { host: 0, join: -1, centrepiece: -2 };
/** The tag on fans won on a revel night. */
export const REVEL_FAN_TAG = "Revel";

/** What a revel night adds to her records. */
export interface RevelRecords {
  revelNights: number;
  /** The most partners she's had in one revel night. */
  revelPartnersMost: number;
  mixedNights: number;
}

export interface RevelDawnInput {
  settings: RevelSettings;
  mix: RevelGuestMix;
  night: RevelNightResult;
  /** How many she had tonight, in her own scenes and the centrepiece. */
  herPartners: number;
  /** Her records before tonight. */
  records: RevelRecords;
  /** The Baron has his cut: the keep looks away, and there's no heat. */
  baronCut?: boolean;
}

export interface RevelDawn {
  gold: number;
  doorGold: number;
  drinkGold: number;
  fame: number;
  respect: number;
  heat: number;
  fans: { tag: typeof REVEL_FAN_TAG; count: number };
  /** Her records after tonight. */
  records: RevelRecords;
  line: string;
}

export const REVEL_DAWN_LINES = {
  quiet: [
    "Dawn finds the hall quiet, cushions scattered, door barred. Smells of sex and ale.",
    "Dawn. Hall's quiet. Cushions everywhere. Door already barred.",
    "Morning. Hall quiet, cushions scattered, door barred. Quiet after the night.",
  ],
  wild: [
    "Dawn finds the hall wrecked. Whole pass already talking about last night.",
    "Dawn. Hall's a mess. The pass is already talking about what happened.",
    "Morning finds the hall wrecked. Word's already out about last night.",
  ],
} as const;

/**
 * The night's results at dawn: gold from the door (paying nights only) and the drinks (more the hotter the room),
 * fame up a lot, respect down, heat up unless the Baron has his cut, fans tagged Revel (more when she's the
 * centrepiece), and her records.
 */
export function revelDawn(d: RevelDawnInput): RevelDawn {
  const s = d.settings;
  const stayed = Math.max(0, d.mix.guests.length - d.night.walkedOut);
  const doorGold = s.door === "paying" ? d.mix.guests.length * DOOR_FEE : 0;
  const drinkGold = Math.round(stayed * DRINKS_EACH[s.door] * (1 + d.night.heat / 100));
  const fame = REVEL_FAME[s.door] + PART_FAME[s.herPart] + Math.floor(d.night.groups.length / 4);
  const respect = REVEL_RESPECT[s.door] + PART_RESPECT[s.herPart];
  const heat = d.baronCut ? 0 : REVEL_HEAT[s.door] + (d.night.heat >= 60 ? 1 : 0);
  const fans = Math.round(stayed * (s.door === "invite" ? 0.15 : 0.25) + (s.herPart === "centrepiece" ? 2 : 0));
  const records: RevelRecords = {
    revelNights: d.records.revelNights + 1,
    revelPartnersMost: Math.max(d.records.revelPartnersMost, d.herPartners),
    mixedNights: d.records.mixedNights + (s.who === "mixed" ? 1 : 0),
  };
  return {
    gold: doorGold + drinkGold,
    doorGold,
    drinkGold,
    fame,
    respect,
    heat,
    fans: { tag: REVEL_FAN_TAG, count: fans },
    records,
    line: pickLog(d.night.heat >= 60 ? REVEL_DAWN_LINES.wild : REVEL_DAWN_LINES.quiet, seedRoll(d.night.heat, d.night.groups.length, d.mix.guests.length)),
  };
}

// ---------- Lines (placeholders until the house voice writes them) ----------

/** The night's opening in the log, by who's invited. */
export const REVEL_OPEN_LINES: Record<RevelWho, readonly string[]> = {
  men: [
    "Door opens on a revel night. Hall fills with men who know why they came. Already hard.",
    "Revel night. Men fill the hall, cocks already out or half out, knowing what the night is for.",
    "The door opens. Men pour in who know exactly why they're here tonight.",
  ],
  mixed: [
    "Door opens on a revel night. Men and women fill the cushions, already touching.",
    "Revel night. Men and women on the cushions, hands already under skirts and in trousers.",
    "The hall fills with men and women who came for the same thing. Cushions are already occupied.",
  ],
  women: [
    "Door opens on a revel night. Hall fills with women who know why they came. Already wet.",
    "Revel night. Women fill the hall, skirts up or off, knowing what the night is for.",
    "The door opens. Women pour in who came for this. Hands already between legs.",
  ],
};

/** A group forming, in the log. `{n}` is how many. */
export const REVEL_GROUP_LINES: readonly string[] = [
  "Across the hall, {n} of them find each other on the cushions, already fucking.",
  "Across the hall {n} of them pair off on the cushions. You can hear them.",
  "{n} of them find each other across the hall. Cushions rocking under them.",
];
/** Someone stopping, or walking out: it ends for them, and the room lets them go. */
export const REVEL_STOP_LINES: readonly string[] = [
  "One of them says no. That's the end of it for them. No one pushes.",
  "Someone says no and it stops for them. That's it.",
  "One says no. It ends for them right there. No more.",
];

// ---------- Passives and titles (ideas, as data) ----------

/** A passive or title the Revel House could give, earned from her revel records. */
export interface RevelHonour {
  id: string;
  name: string;
  kind: "passive" | "title";
  need: string;
  /** Records it needs, each at least this. */
  needs: Partial<RevelRecords>;
  /** What it does, in words (to be wired into passives.ts or titles.ts). */
  does: string;
}

export const REVEL_HONOURS: readonly RevelHonour[] = [
  {
    id: "openHall",
    name: "Open Hall",
    kind: "passive",
    need: "Hold 3 revel nights",
    needs: { revelNights: 3 },
    does: "Revel nights draw two more guests.",
  },
  {
    id: "roomForEveryone",
    name: "Room for Everyone",
    kind: "passive",
    need: "Hold 5 mixed revel nights",
    needs: { mixedNights: 5 },
    does: "On mixed nights, more of the women want her.",
  },
  {
    id: "theWholePass",
    name: "The Whole Pass",
    kind: "passive",
    need: "Have 15 partners in one revel night",
    needs: { revelPartnersMost: 15 },
    does: "The centrepiece holds one more.",
  },
  {
    id: "revelQueen",
    name: "Queen of the Revel",
    kind: "title",
    need: "Hold 10 revel nights",
    needs: { revelNights: 10 },
    does: "Revel nights earn more fame; respect falls a little faster.",
  },
];

/** Whether her records earn an honour. */
export function revelHonourEarned(h: RevelHonour, r: RevelRecords): boolean {
  return (Object.keys(h.needs) as (keyof RevelRecords)[]).every((k) => r[k] >= (h.needs[k] ?? 0));
}
