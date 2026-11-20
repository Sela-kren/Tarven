/**
 * Her brawl skills, Karryn's Prison style: she doesn't start knowing every move. On her first night she can
 * Strike, Dodge, Talk them down, Gather herself, hold her desire back or let it go, and Throw them out. Everything
 * else is a skill she learns, and this is the list of them: the moves each one teaches, what it's for, and how
 * she learns it.
 *
 * - **By edict** (`learn.edict`): bought on the Brawling branch of the edict tree (tavernrules.ts) with edict
 *   points and gold, at the house plans by day.
 * - **Taught by someone** (`learn.teacher`): for special moves a person teaches her (the garrison, the guild, one
 *   of her staff). Nothing is taught that way yet; `Tavern.teachBrawlSkill` is the way in when one is.
 *
 * A move no skill lists is always hers (the lewd ones have their own gates: passives, edicts, her state).
 */
import type { FightMove } from "./fight";
import type { TavernRuleId } from "./tavernrules";

export type BrawlSkillId =
  | "kick"
  | "shove"
  | "stare"
  | "grapple"
  | "dirty"
  | "steel"
  | "eye"
  | "tackle"
  | "breathing"
  | "holdBack"
  | "fixClothes"
  | "stances"
  | "secondWind";

export interface BrawlSkillDef {
  id: BrawlSkillId;
  name: string;
  /** The moves it gives her in a brawl. */
  moves: readonly FightMove[];
  /** What it does, in a line, for the journal and the edict's note. */
  does: string;
  /** How she learns it: an edict on the Brawling branch, or someone teaching her. */
  learn: { edict: TavernRuleId } | { teacher: string };
}

export const BRAWL_SKILLS: readonly BrawlSkillDef[] = [
  { id: "kick", name: "Kick", moves: ["kick"], does: "A harder blow than a strike, but easier to see coming", learn: { edict: "learnKick" } },
  { id: "shove", name: "Shove", moves: ["shove"], does: "Push them back and off balance", learn: { edict: "learnShove" } },
  { id: "stare", name: "Stare Down", moves: ["stare"], does: "Stare them out of the fight with Mind, for willpower", learn: { edict: "learnStare" } },
  { id: "grapple", name: "Grappling", moves: ["grab", "headlock"], does: "Grab their arm, then put them in a headlock", learn: { edict: "learnGrapple" } },
  { id: "dirty", name: "Dirty Fighting", moves: ["hairpull"], does: "Pull their hair: cheap, and it works", learn: { edict: "learnDirty" } },
  { id: "steel", name: "Steel Yourself", moves: ["steel"], does: "Spend willpower for stamina back", learn: { edict: "learnSteel" } },
  { id: "eye", name: "Eye of the Mind", moves: ["eye"], does: "Willpower, no turn: her next blow can't miss and hits harder", learn: { edict: "learnEye" } },
  { id: "tackle", name: "Tackle", moves: ["tackle"], does: "Take them off their feet: a big hit, a big risk", learn: { edict: "learnTackle" } },
  { id: "breathing", name: "Fighter's Breath", moves: ["revitalize", "breathe"], does: "Energy: Revitalize for stamina, Breathe for energy", learn: { edict: "learnBreathing" } },
  { id: "holdBack", name: "Hold Back", moves: ["edge", "resist"], does: "Willpower, no turn: Edging Control, and Resist her pleasure down", learn: { edict: "learnHoldBack" } },
  { id: "fixClothes", name: "Fix Clothes", moves: ["fixClothes"], does: "Put back on the last piece they had off her", learn: { edict: "learnFixClothes" } },
  // Open Pleasure, the stance where she gives in to it, is one of her lewd moves, and isn't learned here.
  { id: "stances", name: "Stances", moves: ["cautious", "defensive", "counter"], does: "Energy, no turn: Cautious, Defensive and Counter stances", learn: { edict: "learnStances" } },
  { id: "secondWind", name: "Second Wind", moves: ["secondWind"], does: "Energy: back up with half her stamina when she's down", learn: { edict: "learnSecondWind" } },
];

export const BRAWL_SKILL_BY_ID: ReadonlyMap<string, BrawlSkillDef> = new Map(BRAWL_SKILLS.map((s) => [s.id, s]));

/** The skill that teaches each move it lists. A move not in here is always hers. */
const SKILL_OF_MOVE: ReadonlyMap<FightMove, BrawlSkillId> = new Map(BRAWL_SKILLS.flatMap((s) => s.moves.map((m) => [m, s.id] as const)));

/** The edict that teaches each skill learned by edict. */
export const SKILL_OF_EDICT: ReadonlyMap<string, BrawlSkillId> = new Map(
  BRAWL_SKILLS.flatMap((s) => ("edict" in s.learn ? [[s.learn.edict, s.id] as const] : [])),
);

/** Whether she knows a move: always for a move no skill lists, else when she has its skill. */
export function knowsMove(move: FightMove, known: ReadonlySet<BrawlSkillId>): boolean {
  const skill = SKILL_OF_MOVE.get(move);
  return skill === undefined || known.has(skill);
}

/** The brawl skills she knows: those whose edict she's enacted, and those someone has taught her. */
export function brawlSkillsKnown(edicts: ReadonlySet<string>, taught: ReadonlySet<string>): Set<BrawlSkillId> {
  const out = new Set<BrawlSkillId>();
  // Anything can be taught too, even a skill that has an edict: a teacher saves her the points.
  for (const s of BRAWL_SKILLS) if (taught.has(s.id) || ("edict" in s.learn && edicts.has(s.learn.edict))) out.add(s.id);
  return out;
}

/** How a skill she doesn't know yet is learned, in a line for the journal. */
export function howToLearn(skill: BrawlSkillDef): string {
  return "edict" in skill.learn ? "Learn it on the Brawling edicts, at the house plans by day" : `Someone has to teach her: ${skill.learn.teacher}`;
}
