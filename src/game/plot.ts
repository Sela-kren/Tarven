/**
 * Act 1's story flags (STORY.md sections 9 and 15): what she did at each written night's last call, and what comes
 * back of it. A flag is set by a choice (or by something she heard), saved with the story, and read by the nights
 * that follow: Silas's brawl, the salt crate, dearer bottles, Ash in the cellar, the talk on the meeting night, and
 * the First in Tarven card.
 *
 * Side nights never set a flag: their small rumours move trust, heat and gold, nothing more.
 */

export type PlotFlag =
  /** She told Pell the salt is under the chapel floor: Oden is fined and his chapel shut. */
  | "odenShut"
  /** She sent Pell to the quarry: Silas owes her, and leaves a crate of salt. */
  | "silasOwes"
  /** She sold the salt: Silas works out who talked. */
  | "silasAngry"
  /** Silas has come in for his brawl (once). */
  | "silasCame"
  /** Ash was caught: told or sold to Garrick. */
  | "ashCaught"
  /** Ash is hidden in her cellar. */
  | "ashHidden"
  /** Mara was arrested at the mill: the Village Rises is closed for good. */
  | "maraArrested"
  /** She told Rhea where the Baron's silver goes, and Rhea didn't march. */
  | "rheaDoubts"
  /** She heard the soldiers say the Baron's short of silver (the deserter night), or Pike's lads (the Watch Canteen). */
  | "heardSilver"
  /** She threw Pell out at dawn (early on her arc, honest, the village behind her). */
  | "defiedPell"
  /** She gave Pell her ear instead of the book: a name at every collection. */
  | "pellsEar"
  /** She told Tansy her grandmother kept a respectable house (the Bakehouse, early on her arc). */
  | "deniedLantern";

export const PLOT_FLAGS: readonly PlotFlag[] = [
  "odenShut",
  "silasOwes",
  "silasAngry",
  "silasCame",
  "ashCaught",
  "ashHidden",
  "maraArrested",
  "rheaDoubts",
  "heardSilver",
  "defiedPell",
  "pellsEar",
  "deniedLantern",
];

export const isPlotFlag = (value: unknown): value is PlotFlag => PLOT_FLAGS.includes(value as PlotFlag);

/** What a heard last-call choice does with the secret: gives it up, keeps it, or sells it. Passives read this. */
export type Deed = "inform" | "protect" | "sell";

/** The deeds of the usual three heard choices, in their order: tell the truth, lie, sell. */
export const DEEDS_IN_ORDER: readonly Deed[] = ["inform", "protect", "sell"];

/** What a conditional choice needs before it's offered. Named, not a function, so a saved night keeps it. */
export type ChoiceNeed =
  /** Hide Ash in the cellar: she protected someone at the salt beat, or she has a kind heart (Kindness 2+). */
  | "shelter"
  /** Tell Rhea where the Baron's silver goes: she heard the soldiers' talk of it. */
  | "heardSilver";

/** Kindness that opens hiding Ash without having protected Silas first. */
export const SHELTER_KINDNESS = 2;

export interface PlotFacts {
  flags: ReadonlySet<PlotFlag>;
  kindness: number;
}

export function needMet(need: ChoiceNeed, facts: PlotFacts): boolean {
  if (need === "shelter") return facts.flags.has("silasOwes") || facts.kindness >= SHELTER_KINDNESS;
  return facts.flags.has("heardSilver");
}

// ---- What comes back ----

/** Silas's crate of salt (silasOwes): every stew pays this much more. */
export const SALT_STEW_GOLD = 1;
/** Silas's crew charge more for bottles once he's been crossed (odenShut or silasAngry). */
export const BOTTLE_MARKUP = 5;

export function bottlesDearer(flags: ReadonlySet<PlotFlag>): boolean {
  return flags.has("odenShut") || flags.has("silasAngry");
}

/** Silas comes in angry the next night after she sold the salt, once. */
export function silasDue(flags: ReadonlySet<PlotFlag>): boolean {
  return flags.has("silasAngry") && !flags.has("silasCame");
}

export const SILAS_ARRIVES = "Silas Crowe walks in with his collar up, and he isn't smiling. Only three people knew about the salt, and he can count.";

/** What the dawn report adds the morning after a choice that set a flag. */
export const FLAG_NEWS: Partial<Record<PlotFlag, string>> = {
  odenShut: "Brother Oden was fined at dawn and his chapel shut. He won't be coming in. Silas's crew have put up their price for bottles.",
  silasOwes: "A crate of salt is on your step, with no note. Stew will sell for more from tonight.",
  silasAngry: "Word is going round that Silas Crowe is asking who talked to Pell.",
  ashCaught: "Garrick rode back past at dawn with a man tied to his saddle. You don't look too closely.",
  ashHidden: "Ash spent the night in your cellar. At dawn he tells you he knew a man in the east, in the cells at the salt mines. \"He had your face.\"",
  maraArrested: "Mara Holt was taken at the mill before sunrise. The farmers' table is very quiet.",
  rheaDoubts: "Rhea didn't march. The garrison is talking about why.",
};

/** What's said in the room as a written night opens, from what she did before. */
export function nightOpening(storyNight: number, flags: ReadonlySet<PlotFlag>): string[] {
  const lines: string[] = [];
  // The meeting night (the third written night).
  if (storyNight === 2) {
    if (flags.has("ashCaught")) lines.push("Rhea's soldiers are saying the deserter hangs at the keep when the snow clears.");
    if (flags.has("ashHidden")) lines.push("Down in the cellar, Ash is keeping quiet. Every time a soldier laughs, the floorboards go still.");
    if (flags.has("odenShut")) lines.push("The chapel's still dark. Somebody's scratched \"who talked?\" on its door.");
  }
  return lines;
}

/** What the First in Tarven card adds, from her Act 1 flags (STORY.md section 7, "How Chapter 1 ends"). */
export function firstInTarvenLines(flags: ReadonlySet<PlotFlag>): string[] {
  const lines: string[] = [];
  lines.push(
    flags.has("maraArrested")
      ? "Mara Holt's chair at the farmers' table stays empty. Nobody sits in it."
      : "Mara Holt raises a cup to you from the farmers' table. The whole table follows.",
  );
  if (flags.has("ashHidden")) lines.push("Down in the cellar, Ash drinks to you too.");
  else if (flags.has("ashCaught")) lines.push("Somebody mentions the deserter who hanged. The table goes quiet, then moves on.");
  lines.push(
    flags.has("odenShut")
      ? "Up the hill, the chapel is still dark."
      : "Up the hill, Brother Oden rings the chapel bell for you, once.",
  );
  if (flags.has("rheaDoubts")) lines.push("Captain Rhea drinks at the bar, off duty, and says nothing about the Baron. She doesn't have to.");
  return lines;
}
