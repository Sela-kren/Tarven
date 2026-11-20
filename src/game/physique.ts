/**
 * Men's bodies, faces and heritage, so no two guests are the same man (the male's MPFB morphs, appearance.ts
 * MALE_SLIDERS). Each guest type has its own range for each part of his physique (a brute is always heavier set
 * than a mage), and each man rolls within it from his look number, so a regular keeps his body. His heritage
 * (African, Asian, European, or a mix of two) picks his features and, with them, his skin tone, and leans his hair
 * and eyes.
 */
import { EYE_COLORS, HAIR_COLORS, SKIN_TONES, type Look } from "./appearance";
import type { GuestRole } from "./guestroles";

type Range = readonly [number, number];

/** A guest type's physique: each slider's range, -1 to 1 (age 0 to 1). Anything left out takes ANYONE's. */
export interface PhysiqueRange {
  muscle?: Range;
  fat?: Range;
  age?: Range;
  proportions?: Range;
  belly?: Range;
  pecs?: Range;
  shoulderWidth?: Range;
}

const ANYONE: Required<PhysiqueRange> = {
  muscle: [-0.5, 0.5], fat: [-0.5, 0.5], age: [0, 0.6], proportions: [-0.5, 0.5], belly: [-0.4, 0.4],
  pecs: [-0.3, 0.4], shoulderWidth: [-0.4, 0.4],
};

export const ROLE_PHYSIQUE: Record<GuestRole, PhysiqueRange> = {
  farmer: { muscle: [0, 0.6], fat: [-0.3, 0.6], age: [0, 0.9], belly: [-0.2, 0.7] },
  soldier: { muscle: [0.3, 0.9], fat: [-0.4, 0.2], age: [0, 0.4], belly: [-0.5, 0], pecs: [0, 0.6], shoulderWidth: [0, 0.6] },
  smuggler: { muscle: [-0.2, 0.5], fat: [-0.5, 0.3], age: [0, 0.6] },
  fugitive: { muscle: [-0.4, 0.3], fat: [-0.8, 0], age: [0, 0.5], belly: [-0.6, 0] },
  archer: { muscle: [0, 0.6], fat: [-0.6, 0], age: [0, 0.4], proportions: [0, 0.8] },
  warrior: { muscle: [0.5, 1], fat: [-0.2, 0.4], age: [0, 0.5], pecs: [0.3, 1], shoulderWidth: [0.3, 1] },
  mage: { muscle: [-0.9, -0.2], fat: [-0.6, 0.4], age: [0, 1], pecs: [-0.5, 0], shoulderWidth: [-0.6, 0] },
  cleric: { muscle: [-0.4, 0.3], fat: [0, 0.6], age: [0.1, 0.9], belly: [0, 0.6] },
  rogue: { muscle: [0, 0.5], fat: [-0.7, -0.1], age: [0, 0.4], proportions: [0, 0.7] },
  brute: { muscle: [0.6, 1], fat: [0.2, 0.9], age: [0, 0.6], belly: [0.2, 0.9], pecs: [0.4, 1], shoulderWidth: [0.5, 1] },
  noble: { muscle: [-0.6, 0.2], fat: [0.2, 0.9], age: [0.1, 0.9], belly: [0.3, 1] },
  servant: { muscle: [-0.4, 0.3], fat: [-0.5, 0.3], age: [0, 0.8] },
};

/** His face's sliders, rolled freely (leaning to the middle) for everyone. */
const FACE = ["headShape", "jaw", "chin", "cheeks", "brow", "noseSize", "noseShape", "neck"] as const;
const FACE_ROLL = 0.8;

export type People = "african" | "asian" | "caucasian";
const PEOPLES: readonly People[] = ["african", "asian", "caucasian"];
/** How often a man is mostly of each people; the rest are an even mix of two. */
const HERITAGE_SHARE: Record<People, number> = { caucasian: 0.42, african: 0.21, asian: 0.21 };
/** Each people's skin tones, as indices into SKIN_TONES (lightest first). */
const TONES: Record<People, readonly number[]> = { caucasian: [0, 1, 2, 3], asian: [1, 2, 3, 4], african: [4, 5, 6, 7] };
/** Hair and eyes mostly dark for these, by index into HAIR_COLORS / EYE_COLORS. */
const DARK_HAIR = [0, 1];
const DARK_EYES = [0, 2];
/** Past this age the hair greys more often than not (HAIR_COLORS' greys). */
const GREY_AGE = 0.6;
const GREY_HAIR = [7, 8];

/** A seeded random from his look number, so the same man always rolls the same. */
function rng(seed: number): () => number {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ 0x5bd1e995) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(list: readonly T[], r: () => number): T => list[Math.floor(r() * list.length) % list.length];
const within = ([low, high]: Range, r: () => number) => Math.round((low + (high - low) * ((r() + r()) / 2)) * 100) / 100;

/** His heritage sliders: mostly one people, or an even mix of two. */
export function rollHeritage(r: () => number): Record<People, number> {
  const out: Record<People, number> = { african: 0, asian: 0, caucasian: 0 };
  let roll = r();
  for (const people of PEOPLES) {
    roll -= HERITAGE_SHARE[people];
    if (roll < 0) {
      out[people] = Math.round((0.75 + 0.25 * r()) * 100) / 100;
      return out;
    }
  }
  const first = pick(PEOPLES, r);
  const second = pick(PEOPLES.filter((p) => p !== first), r);
  out[first] = Math.round((0.4 + 0.2 * r()) * 100) / 100;
  out[second] = Math.round((0.4 + 0.2 * r()) * 100) / 100;
  return out;
}

/** The skin, hair and eyes that go with a heritage and age. */
export function heritageColors(heritage: Record<People, number>, age: number, r: () => number): Record<string, string> {
  const ranked = [...PEOPLES].sort((a, b) => heritage[b] - heritage[a]);
  const main = ranked[0];
  const mixed = heritage[ranked[1]] > 0.3;
  // A mix takes a tone between the two peoples' ranges.
  const tone = mixed
    ? Math.round((pick(TONES[main], r) + pick(TONES[ranked[1]], r)) / 2)
    : pick(TONES[main], r);
  const darkFeatures = main !== "caucasian" || (mixed && ranked[1] !== "caucasian");
  let hair = darkFeatures && r() < 0.9 ? HAIR_COLORS[pick(DARK_HAIR, r)] : pick(HAIR_COLORS.slice(0, 7), r);
  if (age > GREY_AGE && r() < 0.65) hair = HAIR_COLORS[pick(GREY_HAIR, r)];
  const eyes = darkFeatures && r() < 0.85 ? EYE_COLORS[pick(DARK_EYES, r)] : pick(EYE_COLORS, r);
  return { skin: SKIN_TONES[tone], hair, eyes };
}

/**
 * A male guest's body sliders and his skin, hair and eyes, from his look number and type: the same look always the
 * same man.
 */
export function guestMan(look: number, role?: GuestRole): { sliders: Record<string, number>; colors: Record<string, string> } {
  const r = rng(look * 7919 + 17);
  const range = { ...ANYONE, ...(role ? ROLE_PHYSIQUE[role] : {}) };
  const sliders: Record<string, number> = {};
  for (const [id, span] of Object.entries(range) as [keyof PhysiqueRange, Range][]) sliders[id] = within(span, r);
  for (const id of FACE) sliders[id] = Math.round((r() + r() - 1) * FACE_ROLL * 100) / 100;
  const heritage = rollHeritage(r);
  Object.assign(sliders, heritage);
  return { sliders, colors: heritageColors(heritage, sliders.age, r) };
}

/** A random look for him (the customiser's Random): his heritage and its colours on top of the sliders rolled. */
export function withRandomMan(look: Look, random: () => number = Math.random): Look {
  const heritage = rollHeritage(random);
  const age = Math.abs(look.sliders.age ?? 0);
  return {
    ...look,
    sliders: { ...look.sliders, ...heritage, age },
    colors: { ...look.colors, ...heritageColors(heritage, age, random) },
  };
}
