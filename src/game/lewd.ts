import type { TouchRegion } from "./touchtalk";

/** Single mind stage from corruption and lewdness (Karryn-style). */
export function mindStage(corruption: number, lewdness: number): 0 | 1 | 2 | 3 {
  const v = Math.max(corruption, lewdness * 1.5);
  if (v >= 160) return 3;
  if (v >= 80) return 2;
  if (v >= 30) return 1;
  return 0;
}

export function mindStageName(stage: number): string {
  return ["", "warming", "eager", "filthy"][stage] ?? "";
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

/** Appends KP-style flavor; at stage 2+ callers should prefer bodyLine instead. */
export function flavorLine(text: string, corruption: number, lewdness: number, region: TouchRegion, isThought: boolean): string {
  const stage = mindStage(corruption, lewdness);
  if (stage === 0 || !text) return text;
  if (stage >= 2) return bodyLine(region, stage, isThought);
  const mild = isThought
    ? [" (I shouldn't want this.)", " (Why does that feel good?)", " (Don't stop.)"]
    : [" ...don't stop.", " That feels good."];
  const add = mild[Math.floor(Math.random() * mild.length)];
  if (isThought && text.endsWith(")")) return text.slice(0, -1) + add.slice(1);
  if (text.endsWith(".")) return text.slice(0, -1) + add;
  return text + add;
}

export function wildSensitivity(name: string, delta: number, corruption: number, lewdness: number, brothel: boolean): string {
  const stage = mindStage(corruption, lewdness);
  let note = "";
  if (stage >= 3) note = " (filthy — you need more)";
  else if (stage >= 2) note = " (the wanton in you loves it)";
  else if (stage >= 1) note = " (warming up)";
  else if (delta >= 8) note = " (getting sensitive)";
  else if (delta >= 4) note = " (warming up)";
  return `${name} sensitivity +${Math.round(delta)}${note}${brothel ? " [Brothel]" : ""}`;
}
