/**
 * Her stats and skills, each with a level from 1 that grows with experience, the way Karryn's do.
 *
 * Stats are who she is: Strength, Agility and Endurance (mostly for fights), Charm (guests like her: better
 * tips and patience, and she can talk a fight down) and Mind (a cool head: guests mind themselves around her, she
 * picks up gossip faster, and she can stare a troublemaker down).
 *
 * Skills are what she's practised: one for each part of her (from touches she lets happen there) and one for each
 * thing she does upstairs. A higher skill makes those touches need less desire, fill her faster and pay more.
 * Some passives give a skill or stat a level outright.
 */
import type { TouchRegion } from "./touchtalk";
import type { UpstairsAct } from "./passives";

export type StatId = "strength" | "agility" | "endurance" | "charm" | "mind";
export const STATS: readonly { id: StatId; name: string; does: string }[] = [
  { id: "strength", name: "Strength", does: "Hits harder in a fight" },
  { id: "agility", name: "Agility", does: "Lands more blows and dodges more" },
  { id: "endurance", name: "Endurance", does: "Lasts longer in a fight" },
  { id: "charm", name: "Charm", does: "Better tips, longer patience, talks fights down" },
  { id: "mind", name: "Mind", does: "Guests mind themselves, gossip comes faster, stares fights down" },
];

export type BodySkill = "hands" | "mouth" | "neck" | "breasts" | "hips" | "butt" | "thighs" | "pussy" | "exhibition";
export type ActSkill = "upKiss" | "upHands" | "upMouth" | "upBed" | "upBehind" | "upTits" | "upAnal";
export type SkillId = BodySkill | ActSkill;

export const BODY_SKILLS: readonly { id: BodySkill; name: string }[] = [
  { id: "hands", name: "Hands" },
  { id: "mouth", name: "Kissing" },
  { id: "neck", name: "Neck & Hair" },
  { id: "breasts", name: "Breasts" },
  { id: "hips", name: "Hips" },
  { id: "butt", name: "Butt" },
  { id: "thighs", name: "Lap & Thighs" },
  { id: "pussy", name: "Pussy" },
  { id: "exhibition", name: "Exhibition" },
];

/** Skills for what she does upstairs. Ones with no `act` are only trained in the After Hours duel. */
export const ACT_SKILLS: readonly { id: ActSkill; act?: UpstairsAct; name: string }[] = [
  { id: "upKiss", act: "kiss", name: "Making Out" },
  { id: "upHands", act: "hands", name: "Handjob" },
  { id: "upMouth", act: "mouth", name: "Blowjob" },
  { id: "upBed", act: "bed", name: "Sex" },
  { id: "upBehind", act: "behind", name: "From Behind" },
  { id: "upTits", name: "Titjob" },
  { id: "upAnal", name: "Anal" },
];

export const ACT_SKILL_OF: Record<UpstairsAct, ActSkill> = {
  kiss: "upKiss",
  hands: "upHands",
  mouth: "upMouth",
  bed: "upBed",
  behind: "upBehind",
};

/** Which skill a touch on each part of her trains. */
export const SKILL_OF_REGION: Record<TouchRegion, BodySkill> = {
  hand: "hands",
  face: "mouth",
  lips: "mouth",
  hair: "neck",
  neck: "neck",
  shoulder: "neck",
  chest: "breasts",
  waist: "hips",
  rear: "butt",
  thigh: "thighs",
  lap: "thighs",
  intimate: "pussy",
  invite: "pussy",
  clothes: "exhibition",
};

/** Experience it takes to reach each level: level 1 at nothing, level 10 at 320. */
const LEVEL_XP = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320];
export const MAX_LEVEL = LEVEL_XP.length;

/** The level experience alone has reached, 1 to 10. */
export function levelOf(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= LEVEL_XP[level]) level++;
  return level;
}

/** How far into the current level: [experience into it, experience the level spans], or null at the top. */
export function levelProgress(xp: number): [number, number] | null {
  const level = levelOf(xp);
  if (level >= MAX_LEVEL) return null;
  const from = LEVEL_XP[level - 1];
  return [xp - from, LEVEL_XP[level] - from];
}

// ---------- What levels do ----------

/** For a body skill at this level: meter points off what its touches need, faster filling, and gold a touch. */
export function bodySkillBonus(level: number): { ease: number; sens: number; gold: number } {
  const above = Math.max(0, level - 1);
  return { ease: above * 2, sens: above * 0.04, gold: Math.floor(above / 2) };
}

/** For an upstairs skill at this level: more gold, as a fraction. */
export function actSkillBonus(level: number): number {
  return Math.max(0, level - 1) * 0.1;
}

export function charmBonus(level: number): { tip: number; patience: number } {
  const above = Math.max(0, level - 1);
  return { tip: Math.floor(above / 2), patience: above * 0.02 };
}

export function mindBonus(level: number): { nerve: number; listen: number } {
  const above = Math.max(0, level - 1);
  return { nerve: -above * 0.15, listen: above * 0.1 };
}

/** What a skill's level does, in words, for the journal. */
export function skillBonusText(id: SkillId, level: number): string {
  const act = ACT_SKILLS.find((s) => s.id === id);
  if (act && !act.act) return level > 1 ? `+${(level - 1) * 10}% in After Hours` : "No bonus yet";
  if (act) return level > 1 ? `+${Math.round(actSkillBonus(level) * 100)}% gold` : "No bonus yet";
  const b = bodySkillBonus(level);
  if (level <= 1) return "No bonus yet";
  return `Needs ${b.ease} less desire, fills ${Math.round(b.sens * 100)}% faster${b.gold > 0 ? `, +${b.gold} gold` : ""}`;
}

export function statBonusText(id: StatId, level: number): string {
  const above = level - 1;
  if (above <= 0) return "No bonus yet";
  switch (id) {
    case "strength":
      return `+${above} damage`;
    case "agility":
      return `+${above * 3}% to hit and dodge`;
    case "endurance":
      return `+${above * 4} stamina in a fight`;
    case "charm": {
      const c = charmBonus(level);
      return `${c.tip > 0 ? `+${c.tip} gold on tips, ` : ""}guests wait ${Math.round(c.patience * 100)}% longer`;
    }
    case "mind": {
      const m = mindBonus(level);
      return `Guests ${m.nerve.toFixed(1)} nerve, gossip ${Math.round(m.listen * 100)}% faster`;
    }
  }
}

/** Experience is kept in one map, by stat or skill id. */
export type Experience = Partial<Record<StatId | SkillId, number>>;

const IDS: ReadonlySet<string> = new Set<string>([
  ...STATS.map((s) => s.id),
  ...BODY_SKILLS.map((s) => s.id),
  ...ACT_SKILLS.map((s) => s.id),
]);

/** Experience from a save, with anything broken dropped. */
export function readExperience(raw: unknown): Experience {
  const out: Experience = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, n] of Object.entries(raw as Record<string, unknown>)) {
    if (IDS.has(id) && typeof n === "number" && Number.isFinite(n) && n > 0) out[id as StatId | SkillId] = Math.min(1e5, n);
  }
  return out;
}
