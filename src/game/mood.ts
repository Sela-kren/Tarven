/**
 * The state each guest is in tonight. It colours what they say and changes how they behave: how fast they
 * lose patience, whether and how well they tip, how long they stay, and whether they make a mess.
 *
 * A guest walks in with a mood that comes from who they are and what the room has heard about the innkeeper,
 * and it changes through the night with how they're treated. Kept apart from the rules so it can be tested.
 */
import type { BanterContext } from "./banter";
import { statsOf } from "./guestroles";

export type Mood = "calm" | "happy" | "angry" | "lust" | "idolize" | "drunk" | "gloomy" | "scared" | "scheming";

/** What the state is called over a guest's head. A calm guest has nothing to show. */
export const MOOD_LABELS: Record<Mood, string> = {
  calm: "",
  happy: "Happy",
  angry: "Angry",
  lust: "Lustful",
  idolize: "Idolizing you",
  drunk: "Drunk",
  gloomy: "Gloomy",
  scared: "Scared",
  scheming: "Scheming",
};

export interface MoodBehaviour {
  /** How fast they lose patience: 1 is normal, lower is more forgiving. */
  patienceDrain: number;
  /** Whether they'll tip at all. */
  tips: boolean;
  /** Extra gold on top of a tip. */
  tipBonus: number;
  /** How long they stay once served: 1 is normal. */
  stay: number;
  /** Whether they knock something over on the way out. */
  spills: boolean;
  /** They lose their temper once this little of their patience is left. */
  angryBelow: number;
}

export const MOOD_BEHAVIOUR: Record<Mood, MoodBehaviour> = {
  calm: { patienceDrain: 1, tips: true, tipBonus: 0, stay: 1, spills: false, angryBelow: 0.3 },
  happy: { patienceDrain: 0.85, tips: true, tipBonus: 1, stay: 1.1, spills: false, angryBelow: 0.25 },
  angry: { patienceDrain: 1.25, tips: false, tipBonus: 0, stay: 0.8, spills: false, angryBelow: 1 },
  lust: { patienceDrain: 0.75, tips: true, tipBonus: 3, stay: 1.25, spills: false, angryBelow: 0.15 },
  idolize: { patienceDrain: 0.6, tips: true, tipBonus: 4, stay: 1.35, spills: false, angryBelow: 0.1 },
  drunk: { patienceDrain: 1, tips: true, tipBonus: 2, stay: 1.3, spills: true, angryBelow: 0.3 },
  gloomy: { patienceDrain: 0.9, tips: true, tipBonus: 0, stay: 1.2, spills: false, angryBelow: 0.15 },
  scared: { patienceDrain: 1.15, tips: true, tipBonus: 0, stay: 0.7, spills: false, angryBelow: 0 },
  scheming: { patienceDrain: 0.95, tips: true, tipBonus: 2, stay: 1, spills: false, angryBelow: 0.2 },
};

/** How much of their patience someone needs left when served to be pleased about it. */
const PLEASED_ABOVE = 0.55;
/** An angry guest served with this much patience left forgives you. */
const FORGIVES_ABOVE = 0.45;
/** How well known you have to be before anyone idolizes you, and how fast it catches on after that. */
const FAME_TO_IDOLIZE = 12;
const IDOLIZE_PER_FAME = 1.2;

/** At or below this respect, guests start thinking the worst of you; at or above the other, they mind their manners. */
export const LOW_RESPECT = -3;
export const HIGH_RESPECT = 4;
/** At this much lust or longing (out of 10), it comes out in what someone says. */
export const STRONG_LUST = 6;
export const STRONG_DESIRE = 6;

/** How much lust and longing someone walks in with, from 0 to 10. A flirty or disrespected innkeeper stirs up more lust. */
export function arrivalFeelings(c: BanterContext, random: () => number): { lust: number; desires: number } {
  const stats = (c.stats ?? statsOf(c.kind, c.role));
  const lustCeiling = Math.min(10, stats.lustCeiling + c.persona.flirt * 0.6 + Math.max(0, -c.persona.respect) * 0.5);
  return { lust: Math.floor(random() * (lustCeiling + 1)), desires: Math.floor(random() * (stats.desireCeiling + 1)) };
}

/** The mood that shows: strong lust comes through in someone with no other mood on them. */
export function feltMood(guest: { mood: Mood; lust: number }): Mood {
  return guest.mood === "calm" && guest.lust >= STRONG_LUST ? "lust" : guest.mood;
}

/**
 * How likely each mood is for someone walking in, calm first. `filth` is how dirty the room is, from 0 to 1,
 * and `lust` is how much of it they came in with.
 */
export function moodWeights(c: BanterContext, filth: number, lust = 0): [Mood, number][] {
  const lean = (c.stats ?? statsOf(c.kind, c.role)).leanings;
  const local = c.kind === "farmer" || c.kind === "fugitive";
  const betrayed = local ? c.persona.sold + c.persona.informed : 0;
  const hiding = c.kind === "fugitive" || c.kind === "smuggler" || c.kind === "bandit";
  return [
    ["calm", 34],
    ["happy", (lean.happy ?? 0) + (local ? Math.max(0, c.trust) * 1.5 : 0) + Math.max(0, c.persona.kindness)],
    ["angry", (lean.angry ?? 0) + betrayed * 15 + filth * 25],
    ["lust", (lean.lust ?? 0) + 1 + c.persona.flirt * 5 + lust * 2 + Math.max(0, -c.persona.respect) * 4],
    // Famous for the wrong reasons draws fewer admirers.
    ["idolize", Math.max(0, c.persona.fame - FAME_TO_IDOLIZE) * IDOLIZE_PER_FAME * (c.persona.respect <= LOW_RESPECT ? 0.4 : 1)],
    ["drunk", lean.drunk ?? 0],
    ["gloomy", lean.gloomy ?? 0],
    ["scared", (lean.scared ?? 0) + (hiding ? c.heat * 3 : 0)],
    ["scheming", (lean.scheming ?? 0) + c.persona.greed * 2],
  ];
}

/** The mood someone walks in with. */
export function arrivalMood(c: BanterContext, filth: number, random: () => number, lust = 0): Mood {
  const weights = moodWeights(c, filth, lust);
  let roll = random() * weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [mood, weight] of weights) {
    roll -= weight;
    if (roll < 0) return mood;
  }
  return "calm";
}

/** Someone still waiting, with `left` of their patience (0 to 1). */
export function moodWhileWaiting(mood: Mood, left: number): Mood {
  return left < MOOD_BEHAVIOUR[mood].angryBelow ? "angry" : mood;
}

/** Someone just served, with `left` of their patience (0 to 1). */
export function moodWhenServed(mood: Mood, left: number): Mood {
  if (mood === "angry") return left >= FORGIVES_ABOVE ? "calm" : "angry";
  if ((mood === "calm" || mood === "gloomy") && left >= PLEASED_ABOVE) return "happy";
  return mood;
}

/** Drinking with someone cheers them up, and the second round gets them drunk. */
export function moodAfterDrink(mood: Mood, rounds: number): Mood {
  if (rounds >= 2) return "drunk";
  return mood === "calm" || mood === "gloomy" || mood === "angry" ? "happy" : mood;
}

/** How you answered someone: `flirt` and `kindness` are what the answer did to your reputation. */
export function moodAfterReply(mood: Mood, flirt: number, kindness: number): Mood {
  if (flirt > 0) return "lust";
  if (flirt < -1) return "gloomy";
  return kindness > 0 ? "happy" : mood;
}
