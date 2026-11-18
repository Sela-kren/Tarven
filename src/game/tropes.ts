/**
 * The manipulation tropes (CORRUPTION_TROPES.md): how each stage of a fall is written. Whenever someone moves up a
 * stage (her lewdness arc, her corruption tier, a staff member's or a Lantern girl's tier, a staff member's own
 * lewdness stage), the change comes with a story card tagged with the trope that pushed it, and its lines are written
 * in that trope's voice, on one of the five beats.
 *
 * A card is words on the dawn report and nothing else: it never starts a scene, asks for anything or touches anyone.
 * So the consent rule (GAME_PATH.MD) holds as it always did. With Consent on, every step was a yes she (or they)
 * chose, and her card says so; with Consent off it plays by the Consent-off rules, and the card says that instead.
 * Staff always choose their work, whatever the switch. Nothing on any card happens to anyone passed out, and nobody
 * roaring drunk is in one. These are storytelling tools for an adult comedy, not real psychology.
 */

/**
 * The tropes of the doc's table. Rationalisation and blackmail share a row there ("Rationalisation / blackmail"),
 * but the step tables name them apart (the church rationalises, the smugglers blackmail), so each has its own id.
 */
export type TropeId =
  | "corruption"
  | "conditioning"
  | "loveBombing"
  | "rationalisation"
  | "blackmail"
  | "gaslighting"
  | "isolation"
  | "traumaBond"
  | "brainwashing"
  | "mindBreak";

export const TROPE_IDS: readonly TropeId[] = [
  "corruption",
  "conditioning",
  "loveBombing",
  "rationalisation",
  "blackmail",
  "gaslighting",
  "isolation",
  "traumaBond",
  "brainwashing",
  "mindBreak",
];

export interface Trope {
  name: string;
  /** What it is, in a line (the doc's table). */
  what: string;
}

export const TROPES: Readonly<Record<TropeId, Trope>> = {
  corruption: { name: "Corruption", what: "Innocence wears away until she takes on the pusher's wants." },
  conditioning: { name: "Conditioning", what: "Rewards and punishments repeated until the behaviour is automatic." },
  loveBombing: { name: "Love bombing", what: "Lavish praise first, then it's pulled away to keep her chasing it." },
  rationalisation: { name: "Rationalisation", what: "\"This is what you really wanted.\"" },
  blackmail: { name: "Blackmail", what: "Outside pressure: a photo, a debt, a book." },
  gaslighting: { name: "Gaslighting", what: "Making her doubt her own memory or judgement." },
  isolation: { name: "Isolation", what: "Cutting off friends and ways out, so the pusher is all she has." },
  traumaBond: { name: "Trauma bond", what: "Attached to the one who is both the trouble and the comfort." },
  brainwashing: { name: "Brainwashing", what: "Beliefs and wants rewritten outright." },
  mindBreak: { name: "Mind break", what: "Her sense of self cracks and she wants the new role: Legend, past Known, played for laughs and come back from with nights off." },
};

/** The five beats every fall runs through (CORRUPTION_TROPES.md, "How a fall plays out"). */
export type FallBeat = "setup" | "erosion" | "internalisation" | "break" | "aftermath";
export const FALL_BEATS: readonly FallBeat[] = ["setup", "erosion", "internalisation", "break", "aftermath"];

/** A stage change's story card: the trope that drove it, the beat it lands on, who pushed, and its lines. */
export interface StageCard {
  id: string;
  trope: TropeId;
  /** The step's second trope, where the doc names two. */
  also?: TropeId;
  beat: FallBeat;
  /** Who's pushing, in a word or two (the doc's "Who"). */
  who: string;
  title: string;
  /** What the dawn report says, in order. */
  lines: readonly string[];
}

/** Who pushes a staff member's (or a Lantern girl's) corruption up a tier (CORRUPTION_TROPES.md, "Staff"). */
export type Pusher = "madam" | "sabine" | "church" | "smugglers";
export const PUSHERS: readonly Pusher[] = ["madam", "sabine", "church", "smugglers"];

/** A staff member's tier steps that get a card: honest to shady, shady to crooked, and crooked to rotten. */
export type StaffTierStep = "shady" | "crooked" | "rotten";

/** A card's title, as its own line on the dawn report, ahead of its lines (the panel draws it as a heading). */
export function cardTitle(title: string): string {
  return `— ${title} —`;
}

/** Whether a dawn report line is a card's title (`cardTitle`). */
export function isCardTitle(line: string): boolean {
  return /^— .+ —$/.test(line);
}

/** A card's lines for the dawn report: its title, then what it says. */
export function cardLines(card: Pick<StageCard, "title" | "lines">): string[] {
  return [cardTitle(card.title), ...card.lines];
}

/** Fills a card line for one person: {name}, and she/he for {they} {them} {their} (capitalised: {They} {Their}). */
export function fillCard(line: string, name: string, female: boolean): string {
  const p = female ? { they: "she", them: "her", their: "her" } : { they: "he", them: "him", their: "his" };
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  return line
    .replaceAll("{name}", name)
    .replaceAll("{They}", cap(p.they))
    .replaceAll("{Their}", cap(p.their))
    .replaceAll("{they}", p.they)
    .replaceAll("{them}", p.them)
    .replaceAll("{their}", p.their);
}
