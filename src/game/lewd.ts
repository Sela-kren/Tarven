import type { TouchRegion } from "./touchtalk";

/**
 * Her mind stage, Karryn-style, from her Lewdness alone (STORY.md section 15, fix 1): corruption is what she does to
 * people, not how far her body has gone, so a cold informant stays where her lewdness puts her.
 * 0 none, 1 warming, 2 eager, 3 filthy.
 */
export const MIND_AT = [20, 54, 107] as const;

export function mindStage(lewdness: number): 0 | 1 | 2 | 3 {
  if (lewdness >= MIND_AT[2]) return 3;
  if (lewdness >= MIND_AT[1]) return 2;
  if (lewdness >= MIND_AT[0]) return 1;
  return 0;
}

export function mindStageName(stage: number): string {
  return ["", "warming", "eager", "filthy"][stage] ?? "";
}

/**
 * Her arc (STORY.md section 4b): the writing layer on top of the mind stage. Sheltered, Curious, Willing, Known.
 * Willing comes early with three nights shared upstairs (The Back Stairs); Known needs the filthy stage and touches
 * let from four or more kinds of guest, or she still reads as Willing.
 */
export type ArcStage = "sheltered" | "curious" | "willing" | "known";
export const ARC_STAGES: readonly ArcStage[] = ["sheltered", "curious", "willing", "known"];
export const KNOWN_KINDS = 4;

export interface ArcFacts {
  lewdness: number;
  /** She holds The Back Stairs (three nights shared upstairs). */
  backStairs: boolean;
  /** How many kinds of guest she's let touch her, anywhere. */
  kinds: number;
}

export function arcStage(f: ArcFacts): ArcStage {
  const mind = mindStage(f.lewdness);
  if (mind >= 3) return f.kinds >= KNOWN_KINDS ? "known" : "willing";
  if (mind === 2 || f.backStairs) return "willing";
  if (mind === 1) return "curious";
  return "sheltered";
}

/** Where a stage sits, 0 (sheltered) to 3 (known), for comparing. */
export const arcIndex = (stage: ArcStage): number => ARC_STAGES.indexOf(stage);

/** Her own line on the dawn report, the first morning she's a new stage (STORY.md 4b). */
export const ARC_DAWN: Record<ArcStage, string> = {
  sheltered: "(Grandma did this every night? How?)",
  curious: "(I keep thinking about last night. I shouldn't.)",
  willing: "(Good night. Sore feet, full purse, and I didn't hate any of it.)",
  known: "(They'll be back tonight. They always are.)",
};

/** At Willing, if she told Tansy her grandmother kept a respectable house (STORY.md 4b). */
export const TANSY_CALLBACK = "(Respectable. I told Tansy that. I believed it.)";

export function arcStageName(stage: ArcStage): string {
  return stage[0].toUpperCase() + stage.slice(1);
}

const BODY_LINES: Record<string, { t: string[][]; d: string[][] }> = {
  mouth: {
    t: [["(Just a kiss...)", "(Their lips...)"], ["(I want their mouth.)", "(Kiss me properly.)"], ["(Fuck my mouth.)", "(Don't stop kissing me.)"]],
    d: [["...soft.", "That's nice."], ["More.", "Again."], ["Harder.", "Use my mouth."]],
  },
  chest: {
    t: [["(My chest...)", "(They're touching me there.)"], ["(Squeeze them.)", "(I like that.)"], ["(Play with my tits.)", "(Harder on my chest.)"]],
    d: [["Careful.", "That's..."], ["Yes, there.", "Don't stop."], ["Squeeze harder.", "My tits..."]],
  },
  pussy: {
    t: [["(Down there...)", "(I shouldn't.)"], ["(Touch me.)", "(I'm getting wet.)"], ["(Fuck, touch my pussy.)", "(I need it inside.)"]],
    d: [["Not there.", "...oh."], ["Right there.", "Don't stop."], ["More. Right on my pussy.", "Fuck yes."]],
  },
  butt: {
    t: [["(My ass...)", "(They grabbed me.)"], ["(Again.)", "(I liked that.)"], ["(Spank me.)", "(Grab my ass harder.)"]],
    d: [["Hey!", "..."], ["Do it again.", "Harder."], ["Spank me.", "Grab it."]],
  },
  body: {
    t: [["(Their hands...)", "(Close.)"], ["(Hold me.)", "(More.)"], ["(Don't let go.)", "(Touch me everywhere.)"]],
    d: [["...", "Okay."], ["Keep going.", "Yes."], ["More.", "Everywhere."]],
  },
};

function bodyKey(region: TouchRegion): string {
  if (region === "intimate" || region === "thigh" || region === "lap") return "pussy";
  if (region === "rear") return "butt";
  if (region === "lips" || region === "face" || region === "neck") return "mouth";
  if (region === "chest") return "chest";
  return "body";
}

/** Direct body-specific line when mind stage is high. */
export function bodyLine(region: TouchRegion, stage: number, isThought: boolean): string {
  const pool = BODY_LINES[bodyKey(region)] ?? BODY_LINES.body;
  const arr = isThought ? pool.t : pool.d;
  const tier = Math.min(2, Math.max(0, stage - 1));
  const list = arr[tier] ?? arr[0];
  return list[Math.floor(Math.random() * list.length)] ?? list[0];
}

/**
 * Her stage, layered on the touch's own words (STORY.md section 4b): the written line always stays. Curious, a
 * flustered aside; Known, the body's own words after it. Sheltered and Willing speak only in the written line.
 */
export function flavorLine(text: string, stage: ArcStage, region: TouchRegion, isThought: boolean): string {
  if (!text || stage === "sheltered" || stage === "willing") return text;
  if (stage === "known") {
    const body = bodyLine(region, 3, isThought);
    return isThought ? `${text} ${body}` : `${text} You breathe, "${body}"`;
  }
  const mild = isThought
    ? [" (I shouldn't want this.)", " (Why does that feel good?)", " (Don't stop.)"]
    : [" ...don't stop.", " That feels good."];
  const add = mild[Math.floor(Math.random() * mild.length)];
  if (isThought && text.endsWith(")")) return text.slice(0, -1) + add.slice(1);
  if (text.endsWith(".")) return text.slice(0, -1) + add;
  return text + add;
}

export function wildSensitivity(name: string, delta: number, lewdness: number, brothel: boolean): string {
  const stage = mindStage(lewdness);
  let note = "";
  if (stage >= 3) note = " (filthy — you need more)";
  else if (stage >= 2) note = " (the wanton in you loves it)";
  else if (stage >= 1) note = " (warming up)";
  else if (delta >= 8) note = " (getting sensitive)";
  else if (delta >= 4) note = " (warming up)";
  return `${name} sensitivity +${Math.round(delta)}${note}${brothel ? " [Brothel]" : ""}`;
}
