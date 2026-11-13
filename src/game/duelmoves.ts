/**
 * After Hours duel moves — Karryn’s Prison inspired update
 * Every move in the duel, hers and theirs, with its numbers and the line it prints to the duel log.
 * Edit moves here; the rules that use them are in duel.ts.
 */
import type { DuelArea, DuelMove } from "./duel";
import type { Meter } from "./passives";
import type { SkillId, StatId } from "./skills";

/** The moves of hers that come from this table (Hold back and Stop are handled in duel.ts). */
export type HerMove = Exclude<DuelMove, "hold" | "stop">;

/**
 * Her moves: stamina cost, how much pleasure it gives them, how much it gives her,
 * the part of her it needs in play (null = always available), and the skill it trains.
 *
 * Design notes (Karryn’s Prison style):
 * - Early / light moves have low self pleasure and low cost.
 * - Intense acts deal high pleasure to both sides and can easily push her over the edge.
 * - “Giving” moves (hands, mouth, tits) usually deal more to them than she receives.
 * - Penetration / riding deals heavy self pleasure.
 */
export const HER_MOVES: Record<
  HerMove,
  {
    label: string;
    cost: number;
    power: number;   // pleasure dealt to them
    self: number;    // pleasure dealt to her
    area: DuelArea | null;
    skill: SkillId | StatId;
    line: string;
  }
> = {
  // Light / opening moves
  kiss: {
    label: "Kiss them",
    cost: 2,
    power: 7,
    self: 3,
    area: null,
    skill: "upKiss",
    line: "You pull them into a slow, deep kiss. Their breath catches.",
  },
  caress: {
    label: "Caress them",
    cost: 3,
    power: 9,
    self: 2,
    area: null,
    skill: "hands",
    line: "Your hands roam over their body, teasing every sensitive spot.",
  },
  tease: {
    label: "Tease (Charm)",
    cost: 2,
    power: 5,
    self: 1,
    area: null,
    skill: "charm",
    line: "You lean in close and whisper something filthy. They lose their rhythm.",
  },
  undress: {
    label: "Undress",
    cost: 0,
    power: 6,
    self: 2,
    area: null,
    skill: "exhibition",
    line: "You slowly peel off your clothes, watching their eyes darken.",
  },

  // Hand / mouth / tit focused (strong “giving” moves)
  hands: {
    label: "Use your hands",
    cost: 4,
    power: 14,
    self: 4,
    area: "hands",
    skill: "upHands",
    line: "You wrap your fingers around them and stroke with practiced skill.",
  },
  mouth: {
    label: "Use your mouth",
    cost: 5,
    power: 18,
    self: 6,
    area: "mouth",
    skill: "upMouth",
    line: "You sink down and take them into your mouth, tongue working steadily.",
  },
  tits: {
    label: "Use your breasts",
    cost: 5,
    power: 16,
    self: 7,
    area: "breasts",
    skill: "upTits",
    line: "You press your soft breasts around them and move with deliberate pressure.",
  },

  // Penetration / intense
  ride: {
    label: "Ride them",
    cost: 7,
    power: 22,
    self: 16,
    area: "pussy",
    skill: "upBed",
    line: "You climb into their lap, sink down, and start riding them hard.",
  },
  anal: {
    label: "Take them in your ass",
    cost: 8,
    power: 20,
    self: 18,
    area: "butt",
    skill: "upAnal",
    line: "You guide them into your ass and push back against every thrust.",
  },
};

/** Their moves — only usable on the parts of her she has put in play. A kiss is always available. */
export const THEIR_MOVES: Record<
  "kiss" | DuelArea,
  { power: number; meter: Meter; line: string }
> = {
  kiss: {
    power: 6,
    meter: "mouth",
    line: "They pull you into a hungry kiss, tongue pushing past your lips.",
  },
  hands: {
    power: 8,
    meter: "body",
    line: "Their hands roam everywhere — squeezing, pinching, exploring.",
  },
  mouth: {
    power: 10,
    meter: "mouth",
    line: "They kiss you hard and deep until you can barely think.",
  },
  breasts: {
    power: 11,
    meter: "breasts",
    line: "Their hands and mouth find your breasts, teasing and sucking.",
  },
  butt: {
    power: 11,
    meter: "butt",
    line: "They grab your ass hard and pull you tight against them.",
  },
  pussy: {
    power: 15,
    meter: "pussy",
    line: "Their fingers slide between your thighs and start working you open.",
  },
};

/**
 * Her moves when the partner is a woman: her own label and line for each, and a different part of her where it
 * needs one. A move left out here isn't offered against a woman. Cost, power and skill stay as in HER_MOVES.
 */
export const HER_MOVES_ON_WOMEN: Partial<Record<HerMove, { label: string; line: string; area?: DuelArea | null }>> = {
  kiss: { label: "Kiss her", line: "You pull her into a slow, deep kiss. Her breath catches." },
  caress: { label: "Caress her", line: "Your hands roam over her curves, finding every soft spot." },
  tease: { label: "Tease (Charm)", line: "You lean in close and whisper something wicked. She loses her rhythm." },
  undress: { label: "Undress", line: "You slowly peel off your clothes, watching her eyes darken." },
  hands: { label: "Use your fingers on her", line: "You slip your fingers between her thighs and work her slowly." },
  mouth: { label: "Go down on her", line: "You kneel between her thighs and use your tongue." },
  tits: { label: "Press your breasts to hers", line: "You press your breasts against hers and move together, slow and deliberate." },
  ride: { label: "Grind against her", line: "You straddle her thigh and grind against her, harder each time." },
};

/** A woman partner's moves on her, only ever on the parts of her she put in play; a kiss is always part of it. */
export const THEIR_MOVES_WOMEN: Record<"kiss" | DuelArea, { power: number; meter: Meter; line: string }> = {
  kiss: { power: 6, meter: "mouth", line: "She pulls you into a soft, hungry kiss." },
  hands: { power: 8, meter: "body", line: "Her hands roam everywhere, light and teasing." },
  mouth: { power: 10, meter: "mouth", line: "She kisses you deep until you can barely think." },
  breasts: { power: 11, meter: "breasts", line: "Her mouth finds your breasts, teasing and sucking." },
  butt: { power: 11, meter: "butt", line: "She grabs your butt and pulls you tight against her." },
  pussy: { power: 15, meter: "pussy", line: "Her fingers slide between your thighs and start working you." },
};
