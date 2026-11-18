/**
 * The adventurers' guild hall (ADVENTURERS_GUILD.md, WORLD.md §10, TOWN_DAY.md §5 and §6.1). Pure rules, no DOM: the
 * hall's scene, the quest board's panel and the expedition's screens are still to come.
 *
 * - **Joining and ranks** (`GUILD_RANKS`, `promoteGuild`): Kestrel Vey opens the guild to her once the tavern has
 *   300 fans. She starts at F and climbs one rank at a time, F → E → D → C → B → A → S, on guild points, quests
 *   done, brawl wins and fame. The ranks sit on the career ladder of TOWN_DAY.md: F to D she's a **Hired blade**,
 *   C to A a **Party leader**, and at the top she can become **Guild master** (`guildMasterEligible`).
 * - **The quest board** (`QUEST_TEMPLATES`, `questBoard`): about seventeen quests of six kinds (gather, hunt,
 *   escort, dungeon, bounty, and odd jobs for the comedy). She sees the quests of her rank and below, and one rank
 *   above (the isekai rule: you may reach, the guild won't stop you). Some are posted at her own bar once the
 *   adventurers drink there.
 * - **Her party** (`FRIEND_COMPANIONS`, `hireAdventurer`, `partyProblem`): up to three companions, staff friends or
 *   adventurers hired for a fee, each with a role (fighter, healer, scout, mage), a power for fights, a skill for
 *   their role's checks, and loyalty.
 * - **An expedition** (`runExpedition`): a quest is a short chain of encounters, played in order. Fights are
 *   auto-resolved here and flagged `useBrawl: true`, so the game can later play them as a real brawl (`fight.ts`)
 *   and feed the result back. Checks roll her stat plus the best companion of the right role. Choices take the
 *   option the player picked. Her stamina runs down with every fight; at nothing she collapses and the quest fails.
 *   Out of it come the outcome (success, partial, fail), gold, loot, guild points, fans, injuries and each
 *   companion's loyalty.
 * - **Losing** (`ExpeditionResult.captured`): a quest lost to people (bandits, smugglers, a rival party) can end with
 *   her taken. That plays under the brawl-loss rule of GAME_PATH.MD exactly as a lost brawl does (Consent on: offered,
 *   with a final continue / stop choice; Consent off: KP's defeat), and her party or the guild gets her out by
 *   morning, without the loot. Monsters never take her: she's dragged home hurt instead.
 * - **Guild master** (`QUEST_CUTS`, `RECRUIT_DRIVES`, `hallDay`): she runs the hall, sets the guild's cut of every
 *   reward and spends days recruiting.
 *
 * **Luck runs one way:** every roll here takes `rng()` in [0, 1) and a low roll is always the lucky one (a fight won,
 * a check passed, no injury, no rival party), so a test can pin good or bad luck with a constant.
 *
 * Every adventurer, companion and hero is an adult (18+). Companions are friends or paid professionals who chose the
 * work and can walk away (`leaves`); her choices about them are money, risk and care, never their consent.
 */
import type { StatId } from "./skills";
import type { GuestKind } from "./tavern";

/** The random source: a number in [0, 1). Low is lucky. */
export type GuildRng = () => number;

// ---------------------------------------------------------------------------------------------------------------
// Ranks
// ---------------------------------------------------------------------------------------------------------------

export type GuildRankId = "unranked" | "F" | "E" | "D" | "C" | "B" | "A" | "S";
export const GUILD_RANK_IDS: readonly GuildRankId[] = ["unranked", "F", "E", "D", "C", "B", "A", "S"];

/** Her rung on the Adventurer career (TOWN_DAY.md §6.1). Guild master is a post, not a rank (`guildMasterEligible`). */
export type GuildCareer = "none" | "Hired blade" | "Party leader";

export interface GuildRank {
  id: GuildRankId;
  name: string;
  /** Guild points on her card to reach it. */
  points: number;
  /** Quests done (success or partial) to reach it. */
  quests: number;
  /** Brawl wins on her records (WORLD.md §10: her rank comes from jobs and brawl wins). */
  brawlWins: number;
  /** The tavern's fans: the guild only ranks names people know. */
  fans: number;
  /** S only: a legend's deed (the deep vault, the snow troll), not just points. */
  deed?: boolean;
  career: GuildCareer;
  /** How many companions she may take out. A hired blade tags along with fewer; a party leader leads a full party. */
  maxCompanions: number;
  /** What the rank means, for the guild card. */
  about: string;
}

/** Fans the tavern needs before Kestrel offers her a guild card (TOWN_DAY.md §6.1). */
export const JOIN_FANS = 300;

export const GUILD_RANKS: readonly GuildRank[] = [
  { id: "unranked", name: "Unranked", points: 0, quests: 0, brawlWins: 0, fans: 0, career: "none", maxCompanions: 0, about: "No guild card. The board's jobs aren't hers to take." },
  { id: "F", name: "F rank", points: 0, quests: 0, brawlWins: 0, fans: JOIN_FANS, career: "Hired blade", maxCompanions: 1, about: "Rats in cellars, herbs, a goat. Small coin, and the clerk calls her 'the barmaid'." },
  { id: "E", name: "E rank", points: 100, quests: 3, brawlWins: 0, fans: JOIN_FANS, career: "Hired blade", maxCompanions: 2, about: "Boars, slime jelly, other people's lost swords." },
  { id: "D", name: "D rank", points: 300, quests: 8, brawlWins: 3, fans: 400, career: "Hired blade", maxCompanions: 3, about: "Real fighters: wolves on the pass, smugglers on the quarry road." },
  { id: "C", name: "C rank", points: 700, quests: 15, brawlWins: 8, fans: 500, career: "Party leader", maxCompanions: 3, about: "The edge of the ruins and the bandits' outriders. Kestrel's own rank." },
  { id: "B", name: "B rank", points: 1500, quests: 25, brawlWins: 15, fans: 700, career: "Party leader", maxCompanions: 3, about: "Veterans: deep in the ruins. The guild listens to her." },
  { id: "A", name: "A rank", points: 3000, quests: 40, brawlWins: 25, fans: 1000, career: "Party leader", maxCompanions: 3, about: "The pass's monsters by name. Nobles send letters." },
  { id: "S", name: "S rank", points: 6000, quests: 60, brawlWins: 40, fans: 1500, deed: true, career: "Party leader", maxCompanions: 3, about: "A handful in the whole kingdom. A legend with a tavern." },
];

export const GUILD_RANK_BY_ID: Readonly<Record<GuildRankId, GuildRank>> = Object.fromEntries(GUILD_RANKS.map((r) => [r.id, r])) as Record<GuildRankId, GuildRank>;

/** A rank's place on the ladder: unranked 0, F 1 … S 7. */
export function rankIndex(rank: GuildRankId): number {
  return GUILD_RANK_IDS.indexOf(rank);
}

/** The check difficulty of a quest of each rank: her stat level, her best companion's help and a d10 must reach it. */
export const RANK_DC: Readonly<Record<GuildRankId, number>> = { unranked: 8, F: 9, E: 11, D: 13, C: 15, B: 17, A: 19, S: 21 };

/** What `promoteGuild` reads off her records. */
export interface GuildFacts {
  rank: GuildRankId;
  /** Quests done (success or partial). */
  quests: number;
  brawlWins: number;
  /** The tavern's fans. */
  fans: number;
  /** She's done a legend's deed (an S quest won). */
  deed?: boolean;
}

export interface Promotion {
  rank: GuildRankId;
  promoted: boolean;
  /** What still stands between her and the next rank, in plain words (empty at S, or when she's just been promoted). */
  missing: string[];
}

/**
 * Whether her card goes up a rank. One rank at a time, like a real guild clerk: points, quests, brawl wins, fans,
 * and at S a legend's deed. From unranked, joining only needs the fans (Kestrel's 300); the points start at 0.
 */
export function promoteGuild(points: number, facts: GuildFacts): Promotion {
  const at = rankIndex(facts.rank);
  if (at >= GUILD_RANK_IDS.length - 1) return { rank: facts.rank, promoted: false, missing: [] };
  const next = GUILD_RANKS[at + 1];
  const missing: string[] = [];
  if (points < next.points) missing.push(`${next.points - points} more guild points`);
  if (facts.quests < next.quests) missing.push(`${next.quests - facts.quests} more quests`);
  if (facts.brawlWins < next.brawlWins) missing.push(`${next.brawlWins - facts.brawlWins} more brawl wins`);
  if (facts.fans < next.fans) missing.push(`${next.fans - facts.fans} more fans`);
  if (next.deed && !facts.deed) missing.push("a legend's deed");
  if (missing.length) return { rank: facts.rank, promoted: false, missing };
  return { rank: next.id, promoted: true, missing: [] };
}

// ---------------------------------------------------------------------------------------------------------------
// Guild master
// ---------------------------------------------------------------------------------------------------------------

export interface GuildMasterFacts {
  rank: GuildRankId;
  points: number;
  quests: number;
  /** The guild counter stands in her own tavern (WORLD.md §10: the branch office moves to her bar). */
  guildCounter: boolean;
  /** Kestrel Vey speaks for her to the lowland hall. */
  kestrelBacks: boolean;
}

/** Guild master's bar: A rank is enough (they pick a master to run things, not to swing), with these on her card. */
export const GUILD_MASTER = { rank: "A" as GuildRankId, points: 4000, quests: 50 } as const;

/** Whether she can take the hall (TOWN_DAY.md §6.1, the top of the Adventurer ladder), and what's missing if not. */
export function guildMasterEligible(facts: GuildMasterFacts): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (rankIndex(facts.rank) < rankIndex(GUILD_MASTER.rank)) missing.push("A rank or higher");
  if (facts.points < GUILD_MASTER.points) missing.push(`${GUILD_MASTER.points - facts.points} more guild points`);
  if (facts.quests < GUILD_MASTER.quests) missing.push(`${GUILD_MASTER.quests - facts.quests} more quests`);
  if (!facts.guildCounter) missing.push("the guild counter in her tavern");
  if (!facts.kestrelBacks) missing.push("Kestrel's word with the lowland hall");
  return { ok: missing.length === 0, missing };
}

export type QuestCutId = "low" | "fair" | "steep";

export interface QuestCut {
  id: QuestCutId;
  name: string;
  /** The hall's share of every reward posted. */
  cut: number;
  /** Adventurers' mood with her hall, per day: they talk, and they drink at her bar or don't. */
  mood: number;
  about: string;
}

/** The guild's cut of quest rewards, her main lever as master. */
export const QUEST_CUTS: Readonly<Record<QuestCutId, QuestCut>> = {
  low: { id: "low", name: "Low cut (5%)", cut: 0.05, mood: 2, about: "Adventurers love her hall. Parties come from over the pass, and drink at her bar." },
  fair: { id: "fair", name: "Fair cut (10%)", cut: 0.1, mood: 0, about: "What every hall takes. Nobody complains, nobody sings." },
  steep: { id: "steep", name: "Steep cut (20%)", cut: 0.2, mood: -2, about: "Gold in the hall's chest, grumbling at the board. A rival hall starts to look good." },
};

export type RecruitDriveId = "bar" | "road" | "poach" | "heroes";

export interface RecruitDrive {
  id: RecruitDriveId;
  name: string;
  /** Gold it costs. */
  cost: number;
  /** Day hours it takes. */
  hours: number;
  /** Adventurers it brings in, low and high. */
  recruits: readonly [number, number];
  /** Mood change with the guild. */
  mood: number;
  about: string;
}

/** A guild master's recruiting days. */
export const RECRUIT_DRIVES: Readonly<Record<RecruitDriveId, RecruitDrive>> = {
  bar: { id: "bar", name: "Recruit at the bar", cost: 10, hours: 1, recruits: [1, 2], mood: 1, about: "Free drinks for anyone who signs a card. Half of them are farmers." },
  road: { id: "road", name: "Ride out on the ruins road", cost: 20, hours: 4, recruits: [1, 3], mood: 0, about: "Catch parties on the north road before the lowland hall does." },
  poach: { id: "poach", name: "Poach a rival party", cost: 60, hours: 2, recruits: [2, 4], mood: -2, about: "Better pay, a better cut. The rival hall won't forget it." },
  heroes: { id: "heroes", name: "Sponsor a Hero", cost: 100, hours: 3, recruits: [0, 1], mood: 3, about: "Put a kingdom's Hero on the hall's books. Kevin will sign anything with a free lunch in it." },
};

export interface HallDay {
  /** The hall's take from the day's quests. */
  gold: number;
  /** Adventurers' mood change. */
  mood: number;
  /** New members from the drive, if one ran. */
  recruits: number;
}

/**
 * A day of running the hall: the cut of every quest done today (rewards at their posted gold), and a recruiting
 * drive if she ran one (its cost comes out of the take).
 */
export function hallDay(cutId: QuestCutId, questGold: readonly number[], rng: GuildRng, drive?: RecruitDriveId): HallDay {
  const cut = QUEST_CUTS[cutId];
  let gold = Math.round(questGold.reduce((s, g) => s + g, 0) * cut.cut);
  let mood = cut.mood;
  let recruits = 0;
  if (drive) {
    const d = RECRUIT_DRIVES[drive];
    gold -= d.cost;
    mood += d.mood;
    // Low is lucky: more recruits.
    recruits = d.recruits[1] - Math.floor(rng() * (d.recruits[1] - d.recruits[0] + 1));
  }
  return { gold, mood, recruits };
}

// ---------------------------------------------------------------------------------------------------------------
// Companions
// ---------------------------------------------------------------------------------------------------------------

export type PartyRole = "fighter" | "healer" | "scout" | "mage";
export const PARTY_ROLES: readonly PartyRole[] = ["fighter", "healer", "scout", "mage"];

export const ROLE_ABOUT: Readonly<Record<PartyRole, string>> = {
  fighter: "Full power in every fight.",
  healer: "Gives her stamina back after each fight, keeps injuries away, and shortens them after.",
  scout: "Finds the path, spots the traps, and gets the party the first move in fights (+2 power).",
  mage: "Helps with mind checks and hits twice as hard at things weak to magic. Spells sputter in the ruins.",
};

export interface Companion {
  /** A staff id (staff.ts) for friends, or `hired:...` for a hired adventurer. */
  id: string;
  name: string;
  role: PartyRole;
  /** What they add to a fight (fighters all of it, the rest half). */
  power: number;
  /** Their role's skill, 1 to 5, added twice to their role's checks. */
  skill: number;
  /** 0 to 100. Under `LEAVE_LOYALTY` after a quest, they leave her party. */
  loyalty: number;
  /** A staff friend, or hired for the quest. */
  friend: boolean;
  /** A hired adventurer's fee, taken out of the gold. Friends go along for nothing. */
  fee: number;
  /** Their own trick, if they have one. */
  trait?: CompanionTrait;
  about: string;
}

/**
 * A companion's own trick: Hikari's Hero's Luck rerolls the party's first failed fight or check; Mirri's Nine Lives
 * means she's never injured; Snik's Tavern Songs bring fans home; Ash won't take garrison work (he's a deserter).
 */
export type CompanionTrait = "heroLuck" | "nineLives" | "songs" | "deserter";

/** Her staff friends who can join her party (STAFF.md §11 and the roster). They go out at their loyalty as staff. */
export const FRIEND_COMPANIONS: Readonly<Record<string, Companion>> = {
  hikari: { id: "hikari", name: "Hikari", role: "fighter", power: 10, skill: 3, loyalty: 50, friend: true, fee: 0, trait: "heroLuck", about: "A summoned hero whose war ended without her. Still very good with a sword she can't afford to sharpen." },
  grukka: { id: "grukka", name: "Grukka", role: "fighter", power: 9, skill: 2, loyalty: 50, friend: true, fee: 0, about: "Sold her sword in the east for years. Calls every monster 'small'." },
  ash: { id: "ash", name: "Ash", role: "fighter", power: 7, skill: 2, loyalty: 45, friend: true, fee: 0, trait: "deserter", about: "Good with his fists. Won't go near anything the garrison posted." },
  sylvie: { id: "sylvie", name: "Sylvie Ashleaf", role: "healer", power: 2, skill: 4, loyalty: 50, friend: true, fee: 0, about: "Her tonics close cuts on the road. Knows every herb, says nothing about the courts." },
  mirri: { id: "mirri", name: "Mirri", role: "scout", power: 4, skill: 4, loyalty: 50, friend: true, fee: 0, trait: "nineLives", about: "Quick, proud, and up a tree before the trap goes off." },
  snik: { id: "snik", name: "Snik Brassvoice", role: "mage", power: 3, skill: 3, loyalty: 50, friend: true, fee: 0, trait: "songs", about: "A bard's songs are magic if you're loud enough. Films the whole quest for the feed." },
};

const HIRED_NAMES: Readonly<Record<PartyRole, readonly string[]>> = {
  fighter: ["Bors the dwarf", "Tegan of the pass", "Hulda the orc", "Pell's cousin Dace"],
  healer: ["Brother Amsel", "Nettle the hedge witch", "Sister Corra"],
  scout: ["Fen the fox-kin", "Quill", "Little Wren"],
  mage: ["Ysolde, guild mage", "Old Tobiah", "Vix the goblin sparker"],
};

/**
 * Hire an adventurer off the guild's bench for one quest. Stats and fee grow with the rank of the quest; low rolls
 * give the better hire. Hired hands start at loyalty 40 and leave if a quest goes badly enough.
 */
export function hireAdventurer(role: PartyRole, rank: GuildRankId, rng: GuildRng): Companion {
  const tier = Math.max(1, rankIndex(rank));
  const names = HIRED_NAMES[role];
  const name = names[Math.floor(rng() * names.length)];
  const quality = rng() < 0.5 ? 1 : 0;
  const skill = Math.min(5, 1 + Math.floor(tier / 2) + quality);
  const base = role === "fighter" ? 5 : role === "mage" ? 3 : 2;
  return {
    id: `hired:${role}:${name}`,
    name,
    role,
    power: base + tier + quality,
    skill,
    loyalty: 40,
    friend: false,
    fee: 5 * tier + 5 * quality,
    about: "Hired off the guild's bench for one quest.",
  };
}

/** Why this party can't go out (too many, the same person twice, or not ranked), or null if it can. */
export function partyProblem(rank: GuildRankId, party: readonly Companion[]): string | null {
  const max = GUILD_RANK_BY_ID[rank].maxCompanions;
  if (rank === "unranked") return "She needs a guild card first.";
  if (party.length > max) return `At ${GUILD_RANK_BY_ID[rank].name} she can take ${max} companion${max === 1 ? "" : "s"}.`;
  if (new Set(party.map((c) => c.id)).size !== party.length) return "Nobody goes twice.";
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------------------------------------------

export type QuestType = "gather" | "hunt" | "escort" | "dungeon" | "bounty" | "odd";
export const QUEST_TYPES: readonly QuestType[] = ["gather", "hunt", "escort", "dungeon", "bounty", "odd"];

/** Where a quest goes. In the ruins phones die and spells sputter (WORLD.md §1, §11): mages fight at half power there. */
export type QuestPlace = "town" | "quarry woods" | "pass" | "ruins" | "quarry road";

export interface FightEncounter {
  kind: "fight";
  id: string;
  text: string;
  foe: string;
  power: number;
  /** People, not monsters: losing to them can end with her taken (`captured`). */
  people?: boolean;
  /** The brawl guest kind to play it as when it's wired to `fight.ts`. Only for people. */
  brawlKind?: GuestKind;
  weakTo?: "magic";
  /** What it drops when beaten. */
  loot?: string;
  /** The quest's last stand: lose it and the quest fails. */
  boss?: boolean;
}

export interface CheckEncounter {
  kind: "check";
  id: string;
  text: string;
  stat: StatId;
  /** The role whose best companion helps. */
  role: PartyRole;
  /** Added to the quest rank's DC (`RANK_DC`): negative for easy checks. */
  dcMod?: number;
  pass: string;
  fail: string;
  boss?: boolean;
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** An option with a check rolls it (her stat + the role's help vs the quest's DC); without one, it just happens. */
  stat?: StatId;
  role?: PartyRole;
  dcMod?: number;
  /** An option that's a fight. */
  fight?: Omit<FightEncounter, "kind" | "id" | "text">;
  gold?: number;
  points?: number;
  fans?: number;
  corruption?: number;
  text: string;
}

export interface ChoiceEncounter {
  kind: "choice";
  id: string;
  text: string;
  /** The first is the default when the player hasn't picked. */
  options: readonly ChoiceOption[];
  boss?: boolean;
}

export type Encounter = FightEncounter | CheckEncounter | ChoiceEncounter;

export interface QuestTemplate {
  id: string;
  type: QuestType;
  rank: Exclude<GuildRankId, "unranked">;
  title: string;
  /** Who posted it. */
  poster: string;
  place: QuestPlace;
  blurb: string;
  /** Day hours it takes when it fits in a day (`days` 1), out of her nine. */
  hours: number;
  /** Days away. Past 1 she's gone overnight, and the tavern needs staff to open (STAFF.md). */
  days: number;
  gold: number;
  points: number;
  /** Loot on success, on top of what the fights drop. */
  loot: readonly string[];
  /** Posted at her own bar once the adventurers drink there (WORLD.md §10). */
  atBar?: boolean;
  /** Garrison work: Ash won't go. */
  garrison?: boolean;
  /** Winning it is a legend's deed (for S rank). */
  deed?: boolean;
  encounters: readonly Encounter[];
}

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  // ---- F ----
  {
    id: "rats_bell", type: "hunt", rank: "F", title: "Rats in the Copper Bell's cellar", poster: "Jory of the Copper Bell", place: "town",
    blurb: "Rats the size of dogs. Jory swears it's not his ale that drew them. It's his ale.", hours: 2, days: 1, gold: 8, points: 10, loot: ["a cask Jory 'forgot'"],
    encounters: [
      { kind: "check", id: "lamp", text: "The cellar's mana-lamp is dead.", stat: "mind", role: "scout", dcMod: -2, pass: "You find the nests by the smell.", fail: "You find the nests with your foot." },
      { kind: "fight", id: "rats", text: "Rats pour out of a split cask.", foe: "cellar rats", power: 5, loot: "rat tails (bounty)" },
      { kind: "fight", id: "king", text: "The rat king: six of them tangled at the tail, very angry about it.", foe: "the rat king", power: 8, boss: true },
    ],
  },
  {
    id: "gerald", type: "odd", rank: "F", title: "Find Gerald the goat. Again.", poster: "Widow Hale", place: "town",
    blurb: "Gerald is loose. Gerald is always loose. Last seen eating a noble's hat.", hours: 2, days: 1, gold: 5, points: 8, loot: ["a chewed noble's hat"],
    encounters: [
      { kind: "check", id: "track", text: "Hoofprints, hat feathers, and a screaming noble.", stat: "mind", role: "scout", dcMod: -1, pass: "You follow the screaming.", fail: "You follow the wrong screaming." },
      {
        kind: "choice", id: "catch", text: "Gerald is on the chapel roof. Nobody knows how.", boss: true,
        options: [
          { id: "climb", label: "Climb up after him", stat: "agility", role: "scout", text: "You and Gerald come down together, mostly on purpose." },
          { id: "coax", label: "Coax him with bread", stat: "charm", role: "healer", dcMod: -2, text: "Gerald forgives you. Gerald forgives nobody else." },
        ],
      },
    ],
  },
  {
    id: "moonwort", type: "gather", rank: "F", title: "Moonwort for the chapel", poster: "Brother Oden", place: "quarry woods",
    blurb: "Moonwort grows under the quarry trees. So do spiders.", hours: 3, days: 1, gold: 10, points: 12, loot: ["moonwort bundle"],
    encounters: [
      { kind: "check", id: "find", text: "Moonwort looks exactly like six other weeds.", stat: "mind", role: "healer", pass: "You pick the right one.", fail: "You pick a basket of the wrong one first." },
      { kind: "fight", id: "spider", text: "A giant spider drops from the branches.", foe: "a young giant spider", power: 7, loot: "spider silk", boss: true },
    ],
  },
  {
    id: "turnips", type: "escort", rank: "F", title: "Mara's turnips to the keep", poster: "Mara", place: "pass",
    blurb: "A cart of turnips, a lame mule, and a boar who wants the turnips.", hours: 3, days: 1, gold: 9, points: 12, loot: ["a sack of turnips"],
    encounters: [
      { kind: "check", id: "mule", text: "The mule sits down in the road.", stat: "endurance", role: "fighter", dcMod: -1, pass: "You push. The mule, outraged, walks.", fail: "You push for an hour." },
      { kind: "fight", id: "boar", text: "A boar charges the cart.", foe: "a hungry boar", power: 7, loot: "boar meat", boss: true },
    ],
  },
  // ---- E ----
  {
    id: "boars", type: "hunt", rank: "E", title: "Boars below the quarry", poster: "The quarry crew", place: "quarry woods",
    blurb: "Boars are tearing up the haul road. The stew could use them.", hours: 4, days: 1, gold: 18, points: 25, loot: ["boar tusks"], atBar: true,
    encounters: [
      { kind: "check", id: "tracks", text: "The herd's tracks split three ways.", stat: "mind", role: "scout", pass: "You pick the fresh ones.", fail: "They pick you first." },
      { kind: "fight", id: "boars", text: "Two boars come out of the brush.", foe: "boars", power: 10, loot: "boar meat" },
      { kind: "fight", id: "tusker", text: "Old Tusker, scarred from three hunts.", foe: "Old Tusker", power: 13, loot: "a huge tusk", boss: true },
    ],
  },
  {
    id: "slime", type: "gather", rank: "E", title: "Slime jelly from the ruins' edge", poster: "The Warm House", place: "ruins",
    blurb: "The priestesses want slime jelly. They won't say what for. Everyone knows what for.", hours: 4, days: 1, gold: 20, points: 25, loot: ["a jar of slime jelly"],
    encounters: [
      { kind: "check", id: "phones", text: "Your phone dies at the first stone. Nobody brought a map.", stat: "mind", role: "scout", pass: "You remember the way.", fail: "You remember a way." },
      { kind: "fight", id: "slimes", text: "Slimes ooze out of a drain.", foe: "slimes", power: 11, weakTo: "magic", loot: "slime jelly", boss: true },
    ],
  },
  {
    id: "kevin_sword", type: "odd", rank: "E", title: "The Chosen One's lost sword", poster: "Kevin, the Chosen One", place: "town",
    blurb: "Kevin bet his holy sword at dice. He'd like it back before the Crown finds out.", hours: 2, days: 1, gold: 12, points: 20, loot: ["Kevin's IOU"], atBar: true,
    encounters: [
      { kind: "check", id: "who", text: "Who won it? Everybody at the Copper Bell says someone else.", stat: "charm", role: "scout", pass: "A goblin with a new sword and an alibi.", fail: "Three wrong goblins." },
      {
        kind: "choice", id: "deal", text: "The goblin will sell it back.", boss: true,
        options: [
          { id: "haggle", label: "Haggle him down", stat: "charm", role: "mage", text: "He takes Kevin's IOU, which is worth nothing." },
          { id: "pay", label: "Pay his price", gold: -10, text: "You pay. Kevin promises the Crown will pay you back." },
          { id: "grab", label: "Take it", fight: { foe: "a goblin dealer", power: 9, people: true, brawlKind: "smuggler" }, corruption: 2, text: "The sword comes home. The goblin doesn't forget." },
        ],
      },
    ],
  },
  // ---- D ----
  {
    id: "goblin_merchant", type: "escort", rank: "D", title: "A goblin merchant over the pass", poster: "Nix of the Cog Towns", place: "pass",
    blurb: "A cart of phone charms, and a merchant who sells to the wolves if they'll pay.", hours: 6, days: 1, gold: 30, points: 45, loot: ["a box of phone charms"],
    encounters: [
      { kind: "check", id: "road", text: "Snow on the high road.", stat: "endurance", role: "scout", pass: "You find the low road.", fail: "You dig the cart out twice." },
      { kind: "fight", id: "wolves", text: "Wolves circle the cart.", foe: "pass wolves", power: 14, loot: "wolf pelts", boss: true },
      {
        kind: "choice", id: "sale", text: "At the top, Nix offers you a cut to say you saw nothing of what's under the charms.",
        options: [
          { id: "no", label: "Saw nothing? Saw everything", points: 5, text: "Nix sulks. The guild clerk gives you a nod." },
          { id: "yes", label: "Take the cut", gold: 15, corruption: 3, text: "Nix grins. You saw nothing." },
        ],
      },
    ],
  },
  {
    id: "smugglers", type: "bounty", rank: "D", title: "Smugglers on the quarry road", poster: "The garrison", place: "quarry road", garrison: true,
    blurb: "A crew moving salt past the toll. Not Silas's, they say. Probably Silas's.", hours: 5, days: 1, gold: 35, points: 50, loot: ["bounty tokens"],
    encounters: [
      { kind: "check", id: "watch", text: "You lie in the ditch and wait.", stat: "endurance", role: "scout", pass: "The crew walks right into you.", fail: "They hear you sneeze." },
      {
        kind: "choice", id: "deal", text: "Their leader knows your face from the tavern.",
        options: [
          { id: "take", label: "Take them in", fight: { foe: "the salt crew", power: 15, people: true, brawlKind: "smuggler", boss: true }, text: "The salt goes to the garrison, the crew to the cells." },
          { id: "cut", label: "Take a cut and look away", gold: 25, points: -50, corruption: 5, text: "You report the road clear. Silas will hear you were reasonable." },
        ],
        boss: true,
      },
    ],
  },
  {
    id: "frost_wolves", type: "hunt", rank: "D", title: "Frost wolves on the pass", poster: "The toll keepers", place: "pass",
    blurb: "A pack is taking travellers' mules. Travellers are next.", hours: 7, days: 1, gold: 40, points: 55, loot: ["frost wolf pelt"], atBar: true,
    encounters: [
      { kind: "fight", id: "pack", text: "The pack comes out of the snow.", foe: "frost wolves", power: 15, loot: "wolf pelts" },
      { kind: "check", id: "cold", text: "The cold gets into your bones.", stat: "endurance", role: "healer", pass: "Sylvie's kind of tonic, or plain grit.", fail: "Your fingers stop working for a while." },
      { kind: "fight", id: "leader", text: "The pack leader, white as the snow.", foe: "the white wolf", power: 19, loot: "a white pelt", boss: true },
    ],
  },
  // ---- C ----
  {
    id: "ruins_1", type: "dungeon", rank: "C", title: "The north road ruins, floor one", poster: "Kestrel Vey", place: "ruins",
    blurb: "Kestrel's party wants the first floor cleared before they try for B. Phones die at the door.", hours: 9, days: 1, gold: 60, points: 90, loot: ["old coins", "a guardian's core"], atBar: true,
    encounters: [
      { kind: "check", id: "traps", text: "The floor is all pressure plates.", stat: "agility", role: "scout", pass: "You step where the dust is.", fail: "A dart finds you." },
      { kind: "fight", id: "ghouls", text: "Ghouls in the burial hall.", foe: "ghouls", power: 20, weakTo: "magic", loot: "grave gold" },
      { kind: "check", id: "door", text: "A sealed door with words nobody reads any more.", stat: "mind", role: "mage", pass: "It opens.", fail: "It opens, after a long time and a crowbar." },
      { kind: "fight", id: "guardian", text: "An old guardian wakes, stone on stone.", foe: "an old guardian", power: 25, loot: "a guardian's core", boss: true },
    ],
  },
  {
    id: "outriders", type: "bounty", rank: "C", title: "Corran Black's outriders", poster: "Baroness Varn's steward", place: "pass",
    blurb: "Bandits are taxing the pass in Corran's name. The Baroness pays for proof they've stopped.", hours: 8, days: 1, gold: 70, points: 100, loot: ["bandit colours"],
    encounters: [
      { kind: "check", id: "camp", text: "Find their camp before they find you.", stat: "mind", role: "scout", pass: "Smoke in the gully.", fail: "They find you." },
      { kind: "fight", id: "guards", text: "Two guards at the camp's edge.", foe: "bandit guards", power: 18, people: true, brawlKind: "bandit" },
      { kind: "fight", id: "captain", text: "Their captain, and he's heard of you.", foe: "the outrider captain", power: 23, people: true, brawlKind: "bandit", loot: "Corran's orders", boss: true },
    ],
  },
  {
    id: "zane_video", type: "odd", rank: "C", title: "Zane needs a monster for his feed", poster: "Zane", place: "ruins",
    blurb: "The goblin Hero wants a monster fight on video. His phone dies at the ruins. He doesn't know that yet.", hours: 5, days: 1, gold: 25, points: 60, loot: ["Zane's spare phone"],
    encounters: [
      { kind: "fight", id: "slime", text: "A slime the size of a cart. Zane is thrilled.", foe: "a great slime", power: 18, weakTo: "magic", loot: "slime jelly" },
      {
        kind: "choice", id: "post", text: "The phone died. Zane wants to stage it again in the square.", boss: true,
        options: [
          { id: "stage", label: "Fight a cardboard slime for the feed", stat: "charm", role: "mage", fans: 40, text: "It goes viral. You're 'the barmaid who beat a box'." },
          { id: "refuse", label: "No", points: 10, text: "Zane posts that you're no fun. The guild likes you more." },
        ],
      },
    ],
  },
  // ---- B ----
  {
    id: "ruins_3", type: "dungeon", rank: "B", title: "The ruins, floor three", poster: "The lowland hall", place: "ruins",
    blurb: "Two days down in the dark. Whatever guards floor three has outlived two parties.", hours: 9, days: 2, gold: 120, points: 180, loot: ["an old crown", "guardian cores"],
    encounters: [
      { kind: "check", id: "dark", text: "No light but what you carried.", stat: "mind", role: "mage", pass: "A guild light holds.", fail: "Your torch gutters, and something laughs." },
      { kind: "fight", id: "guardians", text: "Guardians in pairs.", foe: "old guardians", power: 30, loot: "guardian cores" },
      { kind: "check", id: "rest", text: "A night camped on floor two.", stat: "endurance", role: "healer", pass: "Everyone wakes rested.", fail: "Nobody sleeps." },
      { kind: "fight", id: "warden", text: "The Warden of floor three.", foe: "the Warden", power: 36, loot: "the Warden's key", boss: true },
    ],
  },
  {
    id: "varn_envoy", type: "escort", rank: "B", title: "Baroness Varn's envoy over the pass", poster: "Baroness Isolde Varn", place: "pass",
    blurb: "An envoy with a sealed letter the Baron would kill for. He might try.", hours: 9, days: 2, gold: 130, points: 170, loot: ["Varn's favour"],
    encounters: [
      { kind: "check", id: "spies", text: "Pell's men are on the road, reading everyone's messages.", stat: "mind", role: "scout", pass: "You take the goat track.", fail: "They know where you are." },
      { kind: "fight", id: "ambush", text: "Hesk's men, in plain coats.", foe: "the Baron's men", power: 32, people: true, brawlKind: "soldier", boss: true },
    ],
  },
  // ---- A ----
  {
    id: "snow_troll", type: "hunt", rank: "A", title: "The snow troll on the high pass", poster: "Every merchant in Tarven", place: "pass",
    blurb: "The troll has shut the pass for a month. The town is out of salt and patience.", hours: 9, days: 2, gold: 250, points: 350, loot: ["troll hide"], atBar: true,
    encounters: [
      { kind: "check", id: "climb", text: "The climb to its cave.", stat: "endurance", role: "scout", pass: "You reach it fresh.", fail: "You reach it gasping." },
      { kind: "fight", id: "troll", text: "The snow troll, three times your height.", foe: "the snow troll", power: 45, loot: "troll hide", boss: true },
    ],
  },
  // ---- S ----
  {
    id: "deep_vault", type: "dungeon", rank: "S", title: "The deep vault under the north road", poster: "Nobody. It's a legend", place: "ruins", deed: true,
    blurb: "The bottom of the ruins. Older than any kingdom. The Hero of the East went down and came back quiet.", hours: 9, days: 3, gold: 600, points: 800, loot: ["the vault's heart"],
    encounters: [
      { kind: "check", id: "descent", text: "Three days down.", stat: "endurance", role: "healer", pass: "You arrive whole.", fail: "You arrive hurt." },
      { kind: "fight", id: "keepers", text: "The vault's keepers.", foe: "the keepers", power: 48, weakTo: "magic" },
      { kind: "fight", id: "heart", text: "The thing that guards the heart.", foe: "the vault's guardian", power: 60, loot: "the vault's heart", boss: true },
    ],
  },
];

export const QUEST_BY_ID: Readonly<Record<string, QuestTemplate>> = Object.fromEntries(QUEST_TEMPLATES.map((q) => [q.id, q]));

/** How many quests the board shows at once. */
export const BOARD_SIZE = 5;

/**
 * Today's quest board: quests of her rank and below, and one rank above. Unranked, the board is shut to her. With
 * `atBar`, only the quests adventurers post at her own bar. Shuffled with `rng`, at most `count`.
 */
export function questBoard(rank: GuildRankId, rng: GuildRng, opts: { count?: number; atBar?: boolean } = {}): QuestTemplate[] {
  if (rank === "unranked") return [];
  const top = rankIndex(rank) + 1;
  const open = QUEST_TEMPLATES.filter((q) => rankIndex(q.rank) <= top && (!opts.atBar || q.atBar));
  const pool = [...open];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, opts.count ?? BOARD_SIZE);
}

// ---------------------------------------------------------------------------------------------------------------
// Injuries
// ---------------------------------------------------------------------------------------------------------------

export type InjuryId = "bruises" | "ankle" | "ribs" | "blackEye" | "concussion";

export interface InjuryDef {
  id: InjuryId;
  name: string;
  /** The stat it takes levels off while it lasts (a debuff, debuffs.ts style). */
  stat: StatId;
  amount: number;
  days: number;
  text: string;
}

export const INJURIES: Readonly<Record<InjuryId, InjuryDef>> = {
  bruises: { id: "bruises", name: "Bruised", stat: "strength", amount: 1, days: 1, text: "Bruised all down one side." },
  ankle: { id: "ankle", name: "Twisted ankle", stat: "agility", amount: 1, days: 2, text: "A twisted ankle. She limps behind the bar." },
  ribs: { id: "ribs", name: "Cracked rib", stat: "endurance", amount: 2, days: 3, text: "A cracked rib. Every breath is a reminder." },
  blackEye: { id: "blackEye", name: "Black eye", stat: "charm", amount: 1, days: 2, text: "A black eye. Every guest asks." },
  concussion: { id: "concussion", name: "Rung bell", stat: "mind", amount: 2, days: 2, text: "Her head's still ringing." },
};
const INJURY_IDS = Object.keys(INJURIES) as InjuryId[];

export interface Injury {
  /** "her", or a companion's id. */
  who: string;
  id: InjuryId;
  days: number;
}

/** Her chance of an injury from a lost fight, and from a won fight against something stronger than the party. */
export const INJURY_CHANCE = { lost: 0.6, hardWin: 0.15, companion: 0.3 } as const;
/** Each point of the best healer's skill takes this share off every injury chance. */
export const HEALER_GUARD = 0.12;

// ---------------------------------------------------------------------------------------------------------------
// Expeditions
// ---------------------------------------------------------------------------------------------------------------

export interface HerOnQuest {
  levels: Readonly<Record<StatId, number>>;
  /** Her stamina going in (fight.ts scale: 20 and up). At nothing she collapses and the quest is over. */
  stamina: number;
}

export interface EncounterResult {
  id: string;
  kind: Encounter["kind"];
  text: string;
  passed: boolean;
  /** A fight: play it as a brawl when wired (`fight.ts`). Here it was auto-resolved. */
  useBrawl?: true;
  foe?: string;
  foePower?: number;
  partyPower?: number;
  brawlKind?: GuestKind;
  /** A fight's win chance, or a check's score against its DC. */
  chance?: number;
  score?: number;
  dc?: number;
  /** The option taken, for a choice. */
  chose?: string;
  /** Hikari's luck turned a failure round. */
  lucky?: boolean;
  staminaLost: number;
  injuries: Injury[];
}

export type ExpeditionOutcome = "success" | "partial" | "fail";

export interface ExpeditionResult {
  quest: string;
  outcome: ExpeditionOutcome;
  encounters: EncounterResult[];
  /** Her gold, after hired fees (can be negative on a bad day: fees are paid win or lose). */
  gold: number;
  /** Fees paid to hired adventurers. */
  fees: number;
  points: number;
  loot: string[];
  /** Fame with adventurers: new fans, who come drinking at her bar. */
  fans: number;
  /** Adventurers who come to the tavern tonight to celebrate (or drown it). */
  guestsTonight: number;
  corruption: number;
  injuries: Injury[];
  /** Each companion's loyalty change. */
  loyalty: Record<string, number>;
  /** Companions who leave her party after this (loyalty under `LEAVE_LOYALTY`). */
  leaves: string[];
  staminaLeft: number;
  /** She collapsed (stamina gone) before the end. */
  collapsed: boolean;
  /**
   * Lost to people: she was taken. The game plays it under the brawl-loss rule of GAME_PATH.MD (Consent on: offered,
   * continue / stop; Consent off: KP's defeat), then her party gets her out by morning. Null if not.
   */
  captured: { by: string; brawlKind?: GuestKind } | null;
  /** Won an S rank's deed. */
  deed: boolean;
  /** A rival party turned up. */
  rival: boolean;
}

/** Loyalty changes by outcome, and for being hurt on her watch. */
export const QUEST_LOYALTY = { success: 4, partial: 1, fail: -3, injured: -2 } as const;
export const LEAVE_LOYALTY = 15;
/** A rival party turns up on quests of E and above this often. */
export const RIVAL_CHANCE = 0.15;
/** Points lost from her card on a failed quest, as a share of its points. */
export const FAIL_PENALTY = 0.25;

/** A rival party at the same job (inserted before the last encounter). */
export function rivalEncounter(rank: GuildRankId): ChoiceEncounter {
  const tier = Math.max(1, rankIndex(rank));
  return {
    kind: "choice",
    id: "rival",
    text: "The Silver Spurs (working name), a rival party, are after the same job, and they've been drinking at the Copper Bell.",
    options: [
      { id: "talk", label: "Talk them into splitting it", stat: "charm", role: "healer", text: "You split it. They'll drink at your bar next time." },
      { id: "race", label: "Race them to it", stat: "agility", role: "scout", text: "You get there first. They'll remember." },
      { id: "fight", label: "Settle it with fists", fight: { foe: "the Silver Spurs", power: 8 + tier * 5, people: true, brawlKind: "adventurer" }, text: "They limp back to town. Word gets round." },
    ],
  };
}

/** Her own power in a fight: strength, agility and endurance, plus a base. */
export function herPower(levels: Readonly<Record<StatId, number>>): number {
  return 3 + levels.strength + levels.agility + levels.endurance;
}

/** The party's power against one foe: hers, fighters in full, the rest at half, scouts' first move, mages by the foe. */
export function partyPower(levels: Readonly<Record<StatId, number>>, party: readonly Companion[], foe: Pick<FightEncounter, "weakTo">, place: QuestPlace): number {
  let p = herPower(levels);
  for (const c of party) {
    if (c.role === "fighter") p += c.power;
    else if (c.role === "mage") {
      let m = c.power;
      if (foe.weakTo === "magic") m *= 2;
      if (place === "ruins") m /= 2;
      p += m;
    } else p += c.power / 2;
    if (c.role === "scout") p += 2;
  }
  return Math.round(p);
}

/** The win chance of a fight: even at equal power, 4% a point either way, never surer than 95% or worse than 5%. */
export function fightChance(party: number, foe: number): number {
  return Math.max(0.05, Math.min(0.95, 0.5 + (party - foe) * 0.04));
}

function best(party: readonly Companion[], role: PartyRole): Companion | undefined {
  return party.filter((c) => c.role === role).sort((a, b) => b.skill - a.skill)[0];
}

/**
 * Run a quest: its encounters in order (a rival party may cut in before the last), each fight auto-resolved, each
 * check rolled, each choice taken from `opts.choices` (by encounter id) or its first option. Ends early if her
 * stamina runs out. Pure: the caller applies the gold, points, loot, injuries and loyalty.
 */
export function runExpedition(
  quest: QuestTemplate,
  party: readonly Companion[],
  her: HerOnQuest,
  rng: GuildRng,
  opts: { choices?: Readonly<Record<string, string>> } = {},
): ExpeditionResult {
  const encounters: Encounter[] = [...quest.encounters];
  let rival = false;
  if (rankIndex(quest.rank) >= rankIndex("E") && rng() >= 1 - RIVAL_CHANCE) {
    rival = true;
    encounters.splice(encounters.length - 1, 0, rivalEncounter(quest.rank));
  }
  const dcBase = RANK_DC[quest.rank];
  const healer = best(party, "healer");
  const guard = Math.max(0, 1 - (healer?.skill ?? 0) * HEALER_GUARD);
  let luck = party.some((c) => c.trait === "heroLuck");
  let stamina = her.stamina;
  const results: EncounterResult[] = [];
  const allInjuries: Injury[] = [];
  const loot: string[] = [];
  let gold = 0;
  let points = 0;
  let fans = 0;
  let corruption = 0;
  let collapsed = false;
  // Kept in an object so the fight helper can set it (closures and narrowing don't mix).
  const taken: { by: ExpeditionResult["captured"]; lastLostTo: ExpeditionResult["captured"] } = { by: null, lastLostTo: null };
  let bossFailed = false;
  const hurt = new Set<string>();

  const injure = (who: string, chance: number, into: Injury[]): void => {
    if (who !== "her" && party.find((c) => c.id === who)?.trait === "nineLives") return;
    if (rng() >= 1 - chance * guard) {
      const def = INJURIES[INJURY_IDS[Math.floor(rng() * INJURY_IDS.length)]];
      const inj = { who, id: def.id, days: def.days };
      into.push(inj);
      allInjuries.push(inj);
      hurt.add(who);
    }
  };

  const fight = (id: string, text: string, f: Omit<FightEncounter, "kind" | "id" | "text">): EncounterResult => {
    const pp = partyPower(her.levels, party, f, quest.place);
    const chance = fightChance(pp, f.power);
    let won = rng() < chance;
    let lucky = false;
    if (!won && luck) {
      luck = false;
      won = rng() < chance;
      lucky = won;
    }
    const lost = Math.max(1, Math.round(f.power / (won ? 3 : 2)));
    stamina -= lost;
    const injuries: Injury[] = [];
    if (!won) {
      injure("her", INJURY_CHANCE.lost, injuries);
      for (const c of party) injure(c.id, INJURY_CHANCE.companion, injuries);
    } else if (f.power > pp) injure("her", INJURY_CHANCE.hardWin, injuries);
    if (healer && stamina > 0) stamina += healer.skill;
    if (won && f.loot) loot.push(f.loot);
    const r: EncounterResult = { id, kind: "fight", text, passed: won, useBrawl: true, foe: f.foe, foePower: f.power, partyPower: pp, chance, staminaLost: lost, injuries };
    if (f.brawlKind) r.brawlKind = f.brawlKind;
    if (lucky) r.lucky = true;
    taken.lastLostTo = !won && f.people ? { by: f.foe, brawlKind: f.brawlKind } : null;
    if (taken.lastLostTo && f.boss) taken.by = taken.lastLostTo;
    return r;
  };

  const check = (stat: StatId, role: PartyRole, dcMod: number): { passed: boolean; score: number; dc: number; lucky: boolean } => {
    const helper = best(party, role);
    const base = her.levels[stat] + (helper ? helper.skill * 2 : 0);
    const dc = dcBase + dcMod;
    const d10 = (): number => 10 - Math.floor(rng() * 10);
    let score = base + d10();
    let lucky = false;
    if (score < dc && luck) {
      luck = false;
      score = base + d10();
      lucky = score >= dc;
    }
    return { passed: score >= dc, score, dc, lucky };
  };

  for (const e of encounters) {
    if (stamina <= 0) {
      collapsed = true;
      break;
    }
    let r: EncounterResult;
    const boss = e.boss ?? false;
    if (e.kind === "fight") {
      r = fight(e.id, e.text, e);
    } else if (e.kind === "check") {
      const c = check(e.stat, e.role, e.dcMod ?? 0);
      if (!c.passed) stamina -= 2;
      r = { id: e.id, kind: "check", text: c.passed ? e.pass : e.fail, passed: c.passed, score: c.score, dc: c.dc, staminaLost: c.passed ? 0 : 2, injuries: [] };
      if (c.lucky) r.lucky = true;
    } else {
      const pick = opts.choices?.[e.id];
      const o = e.options.find((x) => x.id === pick) ?? e.options[0];
      if (o.fight) {
        r = fight(e.id, o.text, { ...o.fight, boss: o.fight.boss ?? boss });
      } else if (o.stat) {
        const c = check(o.stat, o.role ?? "scout", o.dcMod ?? 0);
        if (!c.passed) stamina -= 2;
        r = { id: e.id, kind: "choice", text: c.passed ? o.text : `${o.label}: it doesn't work.`, passed: c.passed, score: c.score, dc: c.dc, staminaLost: c.passed ? 0 : 2, injuries: [] };
        if (c.lucky) r.lucky = true;
      } else {
        r = { id: e.id, kind: "choice", text: o.text, passed: true, staminaLost: 0, injuries: [] };
      }
      r.chose = o.id;
      if (r.passed) {
        gold += o.gold ?? 0;
        points += o.points ?? 0;
        fans += o.fans ?? 0;
      }
      corruption += o.corruption ?? 0;
    }
    if (!r.useBrawl) taken.lastLostTo = null;
    results.push(r);
    if (boss && !r.passed) bossFailed = true;
  }
  // Out on her feet before the end: the quest is lost, and if the last thing that beat her was people, they have her.
  if (collapsed) {
    bossFailed = true;
    if (!taken.by && taken.lastLostTo) taken.by = taken.lastLostTo;
  }

  const fails = results.filter((r) => !r.passed).length;
  const outcome: ExpeditionOutcome = bossFailed ? "fail" : fails <= 1 ? "success" : "partial";
  const share = outcome === "success" ? 1 : outcome === "partial" ? 0.5 : 0;
  gold += Math.round(quest.gold * share);
  points += outcome === "fail" ? -Math.round(quest.points * FAIL_PENALTY) : Math.round(quest.points * share);
  if (outcome === "success") loot.push(...quest.loot);
  if (outcome === "fail" && taken.by) loot.length = 0;
  if (outcome !== "fail") {
    fans += (rankIndex(quest.rank) + 1) * (outcome === "success" ? 3 : 1);
    if (party.some((c) => c.trait === "songs")) fans += 5;
  }
  const fees = party.reduce((s, c) => s + c.fee, 0);
  gold -= fees;
  const guestsTonight = outcome === "success" ? 1 + Math.min(3, Math.floor(rankIndex(quest.rank) / 2)) : outcome === "partial" ? 1 : 0;

  // A healer patches everyone up on the road home: a day off every injury, never under one.
  if (healer) for (const i of allInjuries) i.days = Math.max(1, i.days - 1);

  const loyalty: Record<string, number> = {};
  const leaves: string[] = [];
  for (const c of party) {
    const d = QUEST_LOYALTY[outcome] + (hurt.has(c.id) ? QUEST_LOYALTY.injured : 0);
    loyalty[c.id] = d;
    if (c.loyalty + d < LEAVE_LOYALTY) leaves.push(c.id);
  }

  return {
    quest: quest.id,
    outcome,
    encounters: results,
    gold,
    fees,
    points,
    loot,
    fans,
    guestsTonight,
    corruption,
    injuries: allInjuries,
    loyalty,
    leaves,
    staminaLeft: Math.max(0, stamina),
    collapsed,
    captured: outcome === "fail" ? taken.by : null,
    deed: outcome === "success" && !!quest.deed,
    rival,
  };
}

/** Why a companion won't go on this quest (Ash and the garrison's jobs), or null. */
export function companionRefuses(c: Companion, quest: QuestTemplate): string | null {
  if (c.trait === "deserter" && quest.garrison) return `${c.name} won't touch anything the garrison posted.`;
  return null;
}
