/**
 * The card that opens each day: a pixel icon of its own for every day, and a few lines about how things stand
 * that morning, read from the state of the run: the gold against the baron's debt, how far the village trusts
 * her, how much heat she's drawn, and whether last night left a mess.
 */
import { pixelSvg } from "./icons";

const OUTLINE = "#1c140e";

/** Day 1: the sun coming up over the hills, her first morning in the tavern. */
const SUNRISE = pixelSvg(
  [
    "Y....Y....Y.",
    ".Y...Y...Y..",
    "..Y.....Y...",
    "....KKKK....",
    "...KSSSSK...",
    "..KSSWWSSK..",
    "YKSSWWWWSSKY",
    "KKKKKKKKKKKK",
    "KGGGKKGGGGGK",
    "KGGKHHKGGGGK",
    "KGKHHHHKGGGK",
    "KKKKKKKKKKKK",
  ],
  { K: OUTLINE, Y: "#ffd23a", S: "#f08a24", W: "#fff3b0", G: "#3f7a3a", H: "#5a9a4a" },
);

/** Day 2: the stew pot steaming over the fire, the night stew goes on the menu. */
const STEW_POT = pixelSvg(
  [
    "..W..W..W...",
    "...W..W..W..",
    "..W..W..W...",
    "............",
    "KKKKKKKKKKKK",
    "KSSSSSSSSSSK",
    "KKIIIIIIIIKK",
    ".KIIIIIIIIK.",
    ".KIIIIIIIIK.",
    "..KIIIIIIK..",
    "...KKKKKK...",
    "..R.RY.R.R..",
  ],
  { K: OUTLINE, W: "#e8e4d6", S: "#7a3f16", I: "#4a4a52", R: "#f08a24", Y: "#ffd23a" },
);

/** Day 3: the baron's red wax seal with its crown, the last night before he collects. */
const SEAL = pixelSvg(
  [
    "...KKKKKK...",
    "..KRRRRRRK..",
    ".KRRRRRRRRK.",
    "KRRDRDDRDRRK",
    "KRRDDDDDDRRK",
    "KRRDDDDDDRRK",
    "KRRRRRRRRRRK",
    "KRRDDDDDDRRK",
    ".KRRRRRRRRK.",
    "..KRRRRRRK..",
    "...KRKKRK...",
    "...KK..KK...",
  ],
  { K: OUTLINE, R: "#b0202a", D: "#6e1018" },
);

const DAY_ICONS = [SUNRISE, STEW_POT, SEAL];

/** The icon for a day, counted from 0. Days past the last drawn one reuse the sunrise. */
export function dayIcon(day: number): string {
  return DAY_ICONS[day] ?? SUNRISE;
}

/** How things stand on the morning of a day. */
export interface DayState {
  /** Which day, counted from 0. */
  day: number;
  /** How many days the run has. */
  days: number;
  gold: number;
  debt: number;
  trust: number;
  trustMax: number;
  /** Trust at which the village would stand up to the baron. */
  trustToRise: number;
  heat: number;
  heatMax: number;
  /** Messes left on the floor from last night. */
  messes: number;
  /** How many of those are cobwebs up on the walls. */
  cobwebs?: number;
}

const OPENINGS = [
  "Your first morning in Grandma's tavern. The baron's letter is still lying on the bar.",
  "The second morning. Word of the new keeper is going down the road, and tonight there is stew to sell.",
  "The last morning. After tonight, the baron's riders come up the road to collect.",
];

/** The lines on a day's card, in order: the morning, the money, the village, the baron's men, the mess. */
export function dayStory(s: DayState): string[] {
  const last = s.day >= s.days - 1;
  const lines = [OPENINGS[s.day] ?? (last ? OPENINGS[OPENINGS.length - 1] : "Another morning on the mountain road.")];

  // The money: how much is left to find, and how much a night that comes to.
  const owed = s.debt - s.gold;
  const nightsLeft = s.days - s.day;
  if (owed <= 0) {
    lines.push(`The baron's ${s.debt} gold is already counted out. Whatever you make tonight is yours to keep.`);
  } else if (last) {
    lines.push(`You are ${owed} gold short of the ${s.debt} you owe. It all comes down to tonight.`);
  } else {
    const perNight = Math.ceil(owed / nightsLeft);
    lines.push(`You have ${s.gold} of the ${s.debt} gold you owe: about ${perNight} a night over the next ${nightsLeft} nights.`);
  }

  // The village. On the first morning nobody knows her yet, so there's nothing to say.
  if (s.trust >= s.trustToRise) {
    lines.push("The village is behind you now. If the baron pushes, they may push back.");
  } else if (s.trust >= s.trustMax / 2) {
    lines.push("People nod to you at the well. The village is starting to trust you.");
  } else if (s.day > 0) {
    lines.push("The village still keeps its distance. A fair price and a kept secret would help.");
  }

  // The baron's men.
  if (s.heat >= s.heatMax - 2) {
    lines.push("The baron's men have been asking about you by name. One more slip and they come for you.");
  } else if (s.heat >= s.heatMax / 2) {
    lines.push("A soldier watched the door half the night. Someone is keeping an eye on the tavern.");
  } else if (s.heat > 0) {
    lines.push("There's talk about the new keeper. Be careful what you say, and who you say it to.");
  }

  const cobwebs = s.cobwebs ?? 0;
  if (s.day === 0 && s.messes > 0) {
    // The first morning: the place has stood shut since Grandma died, and cleaning it is the first lesson.
    lines.push("The place has stood shut since Grandma died. Cobwebs hang in the corners and dust lies thick on the floor. Clean it all before you can ring the bell.");
  } else if (s.messes > cobwebs) {
    lines.push("Last night left a mess on the floor. Clean it up before you ring the bell.");
    if (cobwebs > 0) lines.push("A spider has spun a web up on the wall, too.");
  } else if (cobwebs > 0) {
    lines.push("A spider has spun a web up on the wall. Brush it down before the guests see it.");
  }
  return lines;
}

// ---------- The morning after: what the town says, and how she stands ----------

/** Where she stands at a moment: the ledger, the village, and what's said of her. */
export interface Standing {
  gold: number;
  trust: number;
  heat: number;
  respect: number;
  fame: number;
  lewdness: number;
  corruption: number;
  flirt: number;
  kindness: number;
  greed: number;
  drinks: number;
  protected: number;
  informed: number;
  sold: number;
}

/** Talk in the town, most telling first: what changed between the start of the day and the morning after. */
const TALK: { weight: number; says: (d: (key: keyof Standing) => number) => string | null }[] = [
  { weight: 5, says: (d) => (d("sold") > 0 ? "A secret you sold last night is already all over the valley." : null) },
  { weight: 5, says: (d) => (d("informed") > 0 ? "The baron's men are pleased with you. The village has noticed who you talk to." : null) },
  { weight: 4, says: (d) => (d("protected") > 0 ? "The ones you covered for at last call haven't forgotten it. Nor has the village." : null) },
  { weight: 4, says: (d) => (d("heat") >= 2 ? "Soldiers were seen in the square asking questions about the tavern." : null) },
  { weight: 4, says: (d) => (d("lewdness") >= 3 ? "At the smithy, men trade stories about what the keeper let them get away with." : null) },
  { weight: 3, says: (d) => (d("respect") <= -1 ? "Some of last night's guests are telling stories about you that you'd rather they didn't." : null) },
  { weight: 3, says: (d) => (d("kindness") <= -1 ? "Word is the new keeper would sell anything for a coin. The village is cooler toward you." : null) },
  {
    weight: 3,
    says: (d) =>
      d("fame") >= 3
        ? "Your name is going round the market. More people know the tavern on the pass than did yesterday."
        : d("fame") > 0
          ? "A few more faces at the market know who you are."
          : null,
  },
  { weight: 2, says: (d) => (d("trust") >= 2 ? "The village trusts you more than it did yesterday." : null) },
  { weight: 2, says: (d) => (d("flirt") >= 1 ? "The washerwomen giggle about how the keeper carries on with the guests." : null) },
  { weight: 2, says: (d) => (d("greed") >= 1 ? "They say there's nothing the new keeper won't do for a coin." : null) },
  { weight: 1, says: (d) => (d("respect") >= 1 ? "The regulars speak of you with respect." : null) },
  { weight: 1, says: (d) => (d("kindness") >= 1 ? "At the well they say the new keeper has a soft heart." : null) },
  { weight: 1, says: (d) => (d("drinks") >= 3 ? "You woke with a sore head, and the village noticed how much you drank." : null) },
];

/** How many things the town is heard saying of a morning. */
const TALK_LINES = 3;

/** What the town is saying about her the morning after, from what changed since the day began. */
export function townTalk(before: Standing, after: Standing): string[] {
  const d = (key: keyof Standing) => after[key] - before[key];
  const said = TALK.map((t) => ({ weight: t.weight, line: t.says(d) }))
    .filter((t): t is { weight: number; line: string } => t.line !== null)
    // Sorting is stable, so lines of equal weight keep their order above.
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TALK_LINES)
    .map((t) => t.line);
  return said.length > 0 ? said : ["The town barely noticed last night. Nobody is talking about you yet."];
}

/** Respect: a blue shield with a gold cross. */
const SHIELD = pixelSvg(
  [
    "KKKKKKKKKKKK",
    "KBBBBGGBBBBK",
    "KBBBBGGBBBBK",
    "KBBBBGGBBBBK",
    "KGGGGGGGGGGK",
    "KBBBBGGBBBBK",
    "KBBBBGGBBBBK",
    ".KBBBGGBBBK.",
    ".KBBBGGBBBK.",
    "..KBBGGBBK..",
    "...KBGGBK...",
    "....KKKK....",
  ],
  { K: OUTLINE, B: "#3a5a9a", G: "#ffd23a" },
);

/** Fame: a gold star. */
const STAR = pixelSvg(
  [
    ".....KK.....",
    "....KYYK....",
    "....KYYK....",
    "KKKKKYYKKKKK",
    "KYYYYWYYYYYK",
    ".KYYYYYYYYK.",
    "..KYYYYYYK..",
    "..KYYYYYYK..",
    ".KYYYKKYYYK.",
    ".KYYK..KYYK.",
    "KYYK....KYYK",
    "KKK......KKK",
  ],
  { K: OUTLINE, Y: "#ffd23a", W: "#fff3b0" },
);

/** Lewdness: a pink heart. */
const HEART = pixelSvg(
  [
    "............",
    ".KKK....KKK.",
    "KPPPK..KPPPK",
    "KPWPPKKPPPPK",
    "KPWPPPPPPPPK",
    "KPPPPPPPPPPK",
    ".KPPPPPPPPK.",
    "..KPPPPPPK..",
    "...KPPPPK...",
    "....KPPK....",
    ".....KK.....",
    "............",
  ],
  { K: OUTLINE, P: "#ef6f98", W: "#ffd0dc" },
);

/** Corruption: a purple drop. */
const DROP = pixelSvg(
  [
    ".....KK.....",
    "....KVVK....",
    "....KVVK....",
    "...KVVVVK...",
    "..KVVVVVVK..",
    "..KVLVVVVK..",
    ".KVLVVVVVVK.",
    ".KVLVVVVVDK.",
    ".KVVVVVVVDK.",
    "..KVVVVVDK..",
    "...KDDDDK...",
    "....KKKK....",
  ],
  { K: OUTLINE, V: "#8a4ac8", L: "#c9a0f0", D: "#5a2a8a" },
);

/** The icons the rest of the status uses, drawn elsewhere for the HUD. */
export interface StatusIcons {
  gold: string;
  trust: string;
  heat: string;
}

/** The top of each scale that has one. */
export interface StatusLimits {
  debt: number;
  trustMax: number;
  heatMax: number;
}

/** One row of her status: what it is, where it stands, and how far it moved. */
export interface StatusLine {
  label: string;
  icon: string;
  value: string;
  change: number;
  /** Whether the change is good for her, bad, or just a change. */
  tone: "good" | "bad" | "plain";
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Her status as rows, with how each moved since `before` (no change shown without it). */
export function statusLines(now: Standing, before: Standing | null, limits: StatusLimits, icons: StatusIcons): StatusLine[] {
  const line = (label: string, icon: string, key: keyof Standing, value: string, upIs: "good" | "bad" | "plain"): StatusLine => {
    const change = before ? now[key] - before[key] : 0;
    const tone = change === 0 || upIs === "plain" ? "plain" : (change > 0) === (upIs === "good") ? "good" : "bad";
    return { label, icon, value, change, tone };
  };
  return [
    line("Gold", icons.gold, "gold", `${now.gold}/${limits.debt}`, "good"),
    line("Trust", icons.trust, "trust", `${now.trust}/${limits.trustMax}`, "good"),
    line("Heat", icons.heat, "heat", `${now.heat}/${limits.heatMax}`, "bad"),
    line("Respect", SHIELD, "respect", signed(now.respect), "good"),
    line("Fame", STAR, "fame", String(now.fame), "good"),
    line("Lewdness", HEART, "lewdness", String(now.lewdness), "plain"),
    line("Corruption", DROP, "corruption", String(now.corruption), "plain"),
  ];
}

/** How a change is written on its badge. */
export const changeLabel = signed;
