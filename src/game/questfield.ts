/**
 * A quest's map (ADVENTURERS_GUILD.md): once she's accepted a quest on the board and set out, she walks it. Pure
 * rules, no three.js: `questmap.ts` draws what this lays out, and the game plays it.
 *
 * - **The map** (`planField`): made fresh for every quest from a seed, in the look of where the quest goes (the
 *   quarry woods, the snowy pass, the ruins, the town's back alleys, the quarry road). A winding path of clearings
 *   runs north from where she arrives, one clearing per encounter, the quest's last stand in the biggest at the far
 *   end. Everything off the path is blocked and dressed with the place's trees, rocks, pillars or crates.
 * - **Monsters** (`monstersFor`): a quest's fights against beasts become monsters standing in their clearing, as
 *   many as the foe's name says (rats come in a swarm, "the white wolf" is one). When they reach her it's a brawl,
 *   the same brawl as in the taproom (`fight.ts`): the first of them squares up and the rest pile in. Each has a
 *   tavern brawler's numbers (`MonsterSpec.fight`, the same stamina, attack and accuracy a guest has), set by its
 *   shape and the quest fight's power. People (bandits, smugglers, a rival party) are brawled as themselves.
 * - **Levelling** (`killXp`): the brawl's own experience, and on top every monster she puts down is experience for
 *   her Strength and Agility, so walking quests is how she grows.
 *
 * Checks and choices stand in their clearings as something to look at: she walks up and decides there.
 */
import type { Rect } from "./collision";
import { type Companion, type Encounter, type FightEncounter, type GuildRng, type QuestPlace, type QuestTemplate, rankIndex } from "./guild";
import type { StatId } from "./skills";

// ---------------------------------------------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------------------------------------------

export type MonsterShape = "rat" | "boar" | "wolf" | "spider" | "slime" | "ghoul" | "guardian" | "troll";

export interface MonsterSpec {
  shape: MonsterShape;
  /** What the log calls one: "a cellar rat", "Old Tusker". */
  name: string;
  /** Its numbers in a brawl, in a tavern brawler's own terms (guestroles.ts `RoleStats.fight`). */
  fight: { stamina: number; attack: number; accuracy: number };
  /** How fast it comes at her (her walk is 3.2 m/s, her run 5.2: she can always get away running). */
  speed: number;
  /** Scale on its shape's own size. */
  size: number;
  /** How near it must come to start the brawl, metres from her centre to its. */
  reach: number;
  /** Experience she gets for putting it down. */
  xp: number;
  boss: boolean;
  /** A colour over the shape's own (the frost wolves are white). */
  tint?: number;
  weakTo?: "magic";
}

interface ShapeDef {
  /** Words in a foe's name that make it this shape. */
  words: RegExp;
  speed: number;
  /** Its body's radius at size 1, for reach and bumping. */
  radius: number;
  /** A swarm of these comes this many at once. */
  swarm: number;
  /** A brawler's numbers for one at fight power 10: tough or not, hard-hitting or not, sure or wild. */
  brawl: { stamina: number; attack: number; accuracy: number };
}

// Rats: weak, quick, many. Boars: tough chargers. Wolves: sure biters. Spiders: venomous. Slimes: soak up blows and
// hit soft. Ghouls: clawing. Guardians: stone, slow and heavy. Trolls: the biggest brawler in the land.
export const SHAPES: Readonly<Record<MonsterShape, ShapeDef>> = {
  rat: { words: /\brats?\b|rat king/i, speed: 2.8, radius: 0.3, swarm: 5, brawl: { stamina: 9, attack: 2, accuracy: 0.6 } },
  boar: { words: /boars?|tusker/i, speed: 3.4, radius: 0.5, swarm: 2, brawl: { stamina: 22, attack: 5, accuracy: 0.6 } },
  wolf: { words: /wol(f|ves)|pack/i, speed: 4.0, radius: 0.45, swarm: 3, brawl: { stamina: 16, attack: 4, accuracy: 0.8 } },
  spider: { words: /spiders?/i, speed: 2.6, radius: 0.5, swarm: 3, brawl: { stamina: 16, attack: 5, accuracy: 0.7 } },
  slime: { words: /slimes?/i, speed: 1.6, radius: 0.45, swarm: 4, brawl: { stamina: 24, attack: 3, accuracy: 0.5 } },
  ghoul: { words: /ghouls?|keepers?/i, speed: 2.2, radius: 0.4, swarm: 3, brawl: { stamina: 20, attack: 5, accuracy: 0.65 } },
  guardian: { words: /guardians?|warden/i, speed: 1.7, radius: 0.55, swarm: 2, brawl: { stamina: 30, attack: 6, accuracy: 0.55 } },
  troll: { words: /troll/i, speed: 2.4, radius: 0.9, swarm: 1, brawl: { stamina: 36, attack: 8, accuracy: 0.55 } },
};
const SHAPE_ORDER: readonly MonsterShape[] = ["rat", "troll", "boar", "wolf", "spider", "slime", "ghoul", "guardian"];

/** The shape a foe's name makes; a beast nobody named well is a wolf. */
export function shapeOf(foe: string): MonsterShape {
  return SHAPE_ORDER.find((s) => SHAPES[s].words.test(foe)) ?? "wolf";
}

/** How near she has to come before a monster notices her (a boss notices from further). */
export const AGGRO_RANGE = 7;
export const BOSS_AGGRO_RANGE = 9;

/** A plural foe ("boars", "frost wolves", "the keepers") comes as a swarm; a named one or a boss alone. */
function countOf(f: Pick<FightEncounter, "foe" | "boss">, shape: MonsterShape, rng: GuildRng): number {
  if (f.boss) return 1;
  if (!/s$|pack/i.test(f.foe.trim())) return 1;
  const base = SHAPES[shape].swarm;
  return Math.max(2, base - (rng() < 0.5 ? 1 : 0));
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One of a swarm, by name: "frost wolves" → "a frost wolf". */
function oneOf(foe: string): string {
  const one = foe
    .replace(/^the /i, "")
    .replace(/wolves$/i, "wolf")
    .replace(/(rat|boar|spider|slime|ghoul|guardian|keeper)s$/i, "$1");
  return /^[aeiou]/i.test(one) ? `an ${one}` : `a ${one}`;
}

/** A monster's brawl numbers can't run far past the toughest in the tavern: these are the caps. */
const MAX_BRAWL = { stamina: 90, attack: 14, accuracy: 0.9 } as const;

/**
 * The monsters a fight puts in its clearing: how many, their brawl numbers, and what each is worth. The fight's
 * power sets them against their shape's (power 10 is the shape as it stands; it grows with the root of the power,
 * so a troll at 45 is about twice a troll at 10); a big swarm is a little softer each, a boss half again as tough.
 */
export function monstersFor(f: Omit<FightEncounter, "kind" | "id" | "text">, rng: GuildRng): MonsterSpec[] {
  const shape = shapeOf(f.foe);
  const def = SHAPES[shape];
  const boss = f.boss ?? false;
  const count = countOf(f, shape, rng);
  const k = Math.sqrt(f.power / 10) / (count > 2 ? 1.25 : 1);
  const fight = {
    stamina: Math.min(MAX_BRAWL.stamina, Math.max(4, Math.round(def.brawl.stamina * k * (boss ? 1.5 : 1)))),
    attack: Math.min(MAX_BRAWL.attack, Math.max(1, Math.round(def.brawl.attack * k + (boss ? 1 : 0)))),
    accuracy: Math.min(MAX_BRAWL.accuracy, Math.round((def.brawl.accuracy + (boss ? 0.05 : 0)) * 100) / 100),
  };
  const xp = Math.max(1, Math.round((f.power * (boss ? 1.5 : 1)) / count));
  const name = count > 1 ? oneOf(f.foe) : capital(f.foe);
  const tint = /frost|white|snow/i.test(f.foe) ? 0xe8eef4 : undefined;
  const size = (boss ? 1.5 : 1) * (shape === "troll" ? 1.6 : 1) * (/great|giant/i.test(f.foe) && !/young/i.test(f.foe) ? 1.5 : 1);
  return Array.from({ length: count }, () => ({
    shape,
    name,
    fight: { ...fight },
    speed: def.speed * (boss ? 0.9 : 1),
    size,
    reach: def.radius * size + 0.75,
    xp,
    boss,
    ...(tint ? { tint } : {}),
    ...(f.weakTo ? { weakTo: f.weakTo } : {}),
  }));
}

/** Experience from a monster she put down: Strength for the blows, Agility for keeping out of its way. */
export function killXp(m: Pick<MonsterSpec, "xp">): Partial<Record<StatId, number>> {
  return { strength: m.xp, agility: Math.max(1, Math.round(m.xp / 2)) };
}

/** What the brawl calls one: "a frost wolf" → "frost wolf", "The white wolf" → "white wolf". */
export function brawlLabel(m: Pick<MonsterSpec, "name">): string {
  return m.name.replace(/^(an?|the) /i, "");
}

/** Stamina a healer gives back once a clearing's monsters are down: their skill, and a little more. */
export function healerMend(party: readonly Companion[]): number {
  const healer = party.filter((c) => c.role === "healer").sort((a, b) => b.skill - a.skill)[0];
  return healer ? healer.skill + 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------------------------------------------

/** What a map looks like, by where the quest goes. */
export type FieldTheme = "woods" | "pass" | "ruins" | "alleys" | "road";
export const THEME_OF: Readonly<Record<QuestPlace, FieldTheme>> = {
  "quarry woods": "woods",
  pass: "pass",
  ruins: "ruins",
  town: "alleys",
  "quarry road": "road",
};

export type PropKind = "tree" | "pine" | "bush" | "rock" | "boulder" | "pillar" | "wall" | "rubble" | "crate" | "barrel" | "house" | "fence" | "snowbank";

/** Which props dress each place, by weight: the ones by the path, and the ones further off. */
const THEME_PROPS: Readonly<Record<FieldTheme, { near: readonly [PropKind, number][]; far: readonly [PropKind, number][] }>> = {
  woods: { near: [["tree", 4], ["bush", 3], ["boulder", 1], ["rock", 1]], far: [["tree", 5], ["pine", 2], ["bush", 1]] },
  pass: { near: [["rock", 3], ["pine", 3], ["snowbank", 2], ["boulder", 2]], far: [["pine", 4], ["boulder", 2], ["rock", 2]] },
  ruins: { near: [["pillar", 3], ["rubble", 3], ["wall", 2], ["rock", 1]], far: [["wall", 4], ["pillar", 2], ["rubble", 1]] },
  alleys: { near: [["crate", 3], ["barrel", 3], ["fence", 1]], far: [["house", 6], ["crate", 1]] },
  road: { near: [["rock", 2], ["fence", 2], ["bush", 2], ["tree", 1]], far: [["tree", 3], ["boulder", 2], ["bush", 2]] },
};

export interface FieldPoint {
  x: number;
  z: number;
}

export interface FieldClearing extends FieldPoint {
  r: number;
}

export interface FieldProp extends FieldPoint {
  kind: PropKind;
  scale: number;
  /** Its turn about the vertical, radians. */
  turn: number;
}

/** What waits in a clearing for the encounter it holds. */
export type FieldSpawn =
  | { encounter: number; kind: "monsters"; at: FieldPoint; monsters: { spec: MonsterSpec; at: FieldPoint }[] }
  | { encounter: number; kind: "people"; at: FieldPoint }
  | { encounter: number; kind: "spot"; at: FieldPoint };

export interface FieldPlan {
  theme: FieldTheme;
  /** Clearing 0 is where she arrives; one more for each encounter, in order. */
  clearings: FieldClearing[];
  /** The path's width between clearings. */
  pathWidth: number;
  /** Everything she can't walk on, local to the map. */
  blocked: Rect[];
  bounds: Rect;
  props: FieldProp[];
  spawns: FieldSpawn[];
  /** Where she arrives, which way she faces (0 = north), and the way home (the edge of the first clearing). */
  start: FieldPoint;
  startHeading: number;
  exit: FieldPoint;
}

/** Props low enough that she's seen over them: all that may stand between the camera (south) and the path. */
const LOW_PROPS: ReadonlySet<PropKind> = new Set(["bush", "rock", "rubble", "crate", "barrel", "fence", "snowbank"]);
const THEME_LOW: Readonly<Record<FieldTheme, readonly [PropKind, number][]>> = {
  woods: [["bush", 3], ["rock", 1]],
  pass: [["rock", 3], ["snowbank", 2]],
  ruins: [["rubble", 3], ["rock", 1]],
  alleys: [["crate", 2], ["barrel", 2]],
  road: [["bush", 2], ["rock", 2], ["fence", 1]],
};
/** How far north of a spot the path can lie before a tall prop there would hide her from the camera. */
const SIGHT_LINE = 9;

/** Map cells for the blocked ground, in metres. */
const CELL = 1;
const PATH_WIDTH = 4;
/** How far the blocked ground runs out past the last clearing on every side. */
const MARGIN = 8;

/** A small seeded random, for maps: the same seed lays out the same map. */
export function fieldRng(seed: number): GuildRng {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A seed from a quest and a day. */
export function fieldSeed(questId: string, day: number): number {
  let h = 2166136261;
  for (const ch of `${questId}:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function distToSegment(p: FieldPoint, a: FieldPoint, b: FieldPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = dx * dx + dz * dz;
  const t = len > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** How far a point is from the walkable ground (negative inside it, by how far in). */
export function walkDistance(plan: Pick<FieldPlan, "clearings" | "pathWidth">, p: FieldPoint): number {
  let d = Infinity;
  const c = plan.clearings;
  for (const cl of c) d = Math.min(d, Math.hypot(p.x - cl.x, p.z - cl.z) - cl.r);
  for (let i = 1; i < c.length; i++) d = Math.min(d, distToSegment(p, c[i - 1], c[i]) - plan.pathWidth / 2);
  return d;
}

function pick<T>(table: readonly [T, number][], rng: GuildRng): T {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of table) {
    r -= w;
    if (r < 0) return v;
  }
  return table[table.length - 1][0];
}

/** Whether an encounter is a fight against beasts (monsters on the map) rather than people or a decision. */
export function isMonsterFight(e: Encounter): boolean {
  return e.kind === "fight" && !e.people;
}

/**
 * Lays out a quest's map from `rng` (use `fieldRng(fieldSeed(...))` for one that's the same each time): the path's
 * clearings winding north, the blocked ground round them as rectangles, the props that dress it, and what stands
 * in each clearing.
 */
export function planField(quest: Pick<QuestTemplate, "place" | "rank">, encounters: readonly Encounter[], rng: GuildRng): FieldPlan {
  const theme = THEME_OF[quest.place];
  // The clearings: she arrives in the south, and every encounter is further north, the path wandering east and west.
  const clearings: FieldClearing[] = [{ x: 0, z: 0, r: 5 }];
  let x = 0;
  let z = 0;
  encounters.forEach((e, i) => {
    const last = i === encounters.length - 1;
    const r = last || e.boss ? 7.5 : e.kind === "fight" ? 6 : 4.5;
    const prev = clearings[clearings.length - 1];
    z -= prev.r + r + 5 + rng() * 5;
    x = Math.max(-16, Math.min(16, x + (rng() * 2 - 1) * 12));
    clearings.push({ x, z, r });
  });
  const plan = { clearings, pathWidth: PATH_WIDTH };

  const minX = Math.floor(Math.min(...clearings.map((c) => c.x - c.r)) - MARGIN);
  const maxX = Math.ceil(Math.max(...clearings.map((c) => c.x + c.r)) + MARGIN);
  const minZ = Math.floor(Math.min(...clearings.map((c) => c.z - c.r)) - MARGIN);
  const maxZ = Math.ceil(Math.max(...clearings.map((c) => c.z + c.r)) + MARGIN);
  const bounds: Rect = { minX, maxX, minZ, maxZ };

  // The blocked ground: every cell whose middle is off the path, merged along each row into long rectangles.
  const blocked: Rect[] = [];
  const props: FieldProp[] = [];
  const dressing = THEME_PROPS[theme];
  for (let cz = minZ; cz < maxZ; cz += CELL) {
    let runFrom: number | null = null;
    for (let cx = minX; cx <= maxX; cx += CELL) {
      const mid = { x: cx + CELL / 2, z: cz + CELL / 2 };
      const off = cx < maxX && walkDistance(plan, mid) > 0;
      if (off && runFrom === null) runFrom = cx;
      if (!off && runFrom !== null) {
        blocked.push({ minX: runFrom, maxX: cx, minZ: cz, maxZ: cz + CELL });
        runFrom = null;
      }
      if (!off) continue;
      // Dress it: thick by the path so its edge reads, thinner further off.
      const d = walkDistance(plan, mid);
      const chance = d < 1.5 ? 0.35 : d < 4 ? 0.22 : 0.08;
      if (rng() < chance) {
        let kind = pick(d < 2.5 ? dressing.near : dressing.far, rng);
        // The camera looks north from the south: nothing tall just south of the path, where it would hide her.
        if (!LOW_PROPS.has(kind)) {
          for (let ahead = 1; ahead <= SIGHT_LINE; ahead += 1) {
            if (walkDistance(plan, { x: mid.x, z: mid.z - ahead }) < 0) {
              kind = pick(THEME_LOW[theme], rng);
              break;
            }
          }
        }
        props.push({ kind, x: mid.x + (rng() - 0.5) * 0.6, z: mid.z + (rng() - 0.5) * 0.6, scale: 0.8 + rng() * 0.5, turn: rng() * Math.PI * 2 });
      }
    }
  }

  // What stands in each clearing.
  const spawns: FieldSpawn[] = encounters.map((e, i): FieldSpawn => {
    const c = clearings[i + 1];
    const at = { x: c.x, z: c.z };
    if (e.kind === "fight" && !e.people) {
      const specs = monstersFor(e, rng);
      const turn0 = rng() * Math.PI * 2;
      const monsters = specs.map((spec, k) => {
        if (specs.length === 1) return { spec, at: { x: c.x, z: c.z - c.r * 0.2 } };
        const a = turn0 + (k / specs.length) * Math.PI * 2;
        const rr = c.r * (0.35 + rng() * 0.2);
        return { spec, at: { x: c.x + Math.cos(a) * rr, z: c.z + Math.sin(a) * rr } };
      });
      return { encounter: i, kind: "monsters", at, monsters };
    }
    if (e.kind === "fight") return { encounter: i, kind: "people", at };
    return { encounter: i, kind: "spot", at };
  });

  const first = clearings[0];
  return {
    theme,
    clearings,
    pathWidth: PATH_WIDTH,
    blocked,
    bounds,
    props,
    spawns,
    start: { x: first.x, z: first.z + 1.5 },
    startHeading: 0,
    exit: { x: first.x, z: first.z + first.r - 1.2 },
  };
}

/** How tough the place feels for the log: the quest's rank, in words. */
export function dangerWord(rank: QuestTemplate["rank"]): string {
  const i = rankIndex(rank);
  return i <= 1 ? "quiet" : i <= 3 ? "dangerous" : i <= 5 ? "deadly" : "legendary";
}
