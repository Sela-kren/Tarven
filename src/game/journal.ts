/**
 * The innkeeper's journal: an open book with your name and how you stand. The left page is the ledger and the
 * village (gold against the debt, trust and heat); the right page is what the room says about you. It's read
 * from the book on the chest in the bedroom, instead of crowding the screen with every number. A second, private
 * spread keeps the adult side: desire, tonight's touches, and every touch let happen so far.
 */
import type { Persona } from "./banter";
import type { TouchRegion } from "./touchtalk";
import { COIN, FLAME, VILLAGERS } from "./hud";
import { pixelSvg } from "./icons";

export interface JournalState {
  name: string;
  /** Which night it is, from 1, and how many there are. */
  night: number;
  nights: number;
  gold: number;
  debt: number;
  trust: number;
  trustMax: number;
  /** Trust at which the village rises against the baron. */
  trustToRise: number;
  heat: number;
  heatMax: number;
  persona: Persona;
  desire: number;
  desireMax: number;
}

/** The baron's note of what you owe: a rolled scroll with a red seal. */
const SCROLL = pixelSvg(
  [
    "............",
    ".KKKKKKKKK..",
    "KPPPPPPPPPK.",
    "KPKKKKKKPPK.",
    ".KPPPPPPPK..",
    ".KPKKKKKPK..",
    ".KPPPPPPPK..",
    ".KPKKKPPRRK.",
    ".KPPPPPRRRRK",
    "KPPPPPPPRRK.",
    "KKKKKKKKKK..",
    "............",
  ],
  { K: "#1c140e", P: "#f0e2b8", R: "#c8200f" },
);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * A bar in pixel segments. One-sided bars fill from the left; two-sided ones (respect, kindness) fill out from
 * the middle, left when it's bad and right when it's good.
 */
function meter(value: number, min: number, max: number, tone: "gold" | "red" | "green" = "gold"): HTMLElement {
  const bar = el("span", `meter ${tone}`);
  const fill = el("span", "fill");
  if (min < 0) {
    bar.classList.add("two-sided");
    const share = Math.min(1, Math.abs(value) / max) * 50;
    fill.style.left = value >= 0 ? "50%" : `${50 - share}%`;
    fill.style.width = `${share}%`;
    if (value < 0) bar.classList.add("low");
  } else {
    fill.style.left = "0";
    fill.style.width = `${(Math.min(max, Math.max(min, value)) / max) * 100}%`;
  }
  bar.append(fill);
  return bar;
}

/** One line of the book: an icon or nothing, a label, a bar or nothing, and the number. */
function row(label: string, value: string, options: { icon?: string; bar?: HTMLElement; hint?: string } = {}): HTMLElement {
  const line = el("div", "line");
  const icon = el("span", "icon");
  if (options.icon) icon.innerHTML = options.icon;
  line.append(icon, el("span", "label", label));
  if (options.bar) line.append(options.bar);
  else line.classList.add("plain");
  line.append(el("span", "value", value));
  if (options.hint) line.title = options.hint;
  return line;
}

/** Builds the open journal. `onName` is called as the player writes their name on the first page. */
export function journalBook(state: JournalState, onName: (name: string) => void): HTMLElement {
  const book = el("div", "journal-book");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);

  // The first page: your name, written in. Typing here mustn't reach the game's keys.
  const name = el("input", "name");
  name.type = "text";
  name.maxLength = 24;
  name.placeholder = "Write your name";
  name.value = state.name;
  name.spellcheck = false;
  name.setAttribute("aria-label", "Your name");
  for (const type of ["keydown", "keyup"] as const) {
    name.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type === "keydown" && (event.key === "Enter" || event.key === "Escape")) name.blur();
    });
  }
  name.addEventListener("input", () => onName(name.value.trim()));
  left.append(name, el("p", "role", `Innkeeper of Tarven · Night ${state.night} of ${state.nights}`));

  left.append(el("h2", "", "Ledger"));
  left.append(row("Gold", String(state.gold), { icon: COIN }));
  left.append(row("Owed to the baron", String(state.debt), { icon: SCROLL }));
  const short = state.debt - state.gold;
  left.append(el("p", short > 0 ? "note" : "note good", short > 0 ? `${short} gold short.` : "Enough to pay him."));

  left.append(el("h2", "", "The village"));
  left.append(
    row("Trust", `${state.trust}/${state.trustMax}`, {
      icon: VILLAGERS,
      bar: meter(state.trust, 0, state.trustMax, "green"),
    }),
  );
  left.append(el("p", "note", `At ${state.trustToRise} the village stands with you against the baron.`));
  left.append(
    row("Heat", `${state.heat}/${state.heatMax}`, { icon: FLAME, bar: meter(state.heat, 0, state.heatMax, "red") }),
  );
  left.append(el("p", state.heat >= state.heatMax - 2 ? "note danger" : "note", `At ${state.heatMax} the baron's men come for you.`));

  const p = state.persona;
  right.append(el("h2", "", "What they say of you"));
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  right.append(row("Respect", sign(p.respect), { bar: meter(p.respect, -10, 10) }));
  right.append(row("Kindness", sign(p.kindness), { bar: meter(p.kindness, -10, 10) }));
  right.append(row("Fame", String(p.fame), { bar: meter(p.fame, 0, 100) }));
  right.append(row("Flirt", String(p.flirt), { bar: meter(p.flirt, 0, 10, "red") }));
  right.append(row("Greed", String(p.greed), { bar: meter(p.greed, 0, 10) }));
  right.append(row("Desire", String(Math.round(state.desire)), { bar: meter(state.desire, 0, state.desireMax, "red") }));

  right.append(el("h2", "", "Deeds"));
  right.append(row("Drinks with guests", String(p.drinks)));
  right.append(row("Secrets kept", String(p.protected)));
  right.append(row("Told to the baron's men", String(p.informed)));
  right.append(row("Secrets sold", String(p.sold)));
  return book;
}

// ---------- The private pages ----------

/** What the private pages show: desire, tonight's touches, and every touch let happen so far. */
export interface PrivateState {
  /** Whether guests reach for the player at all; for now only the sister is touched. */
  touchable: boolean;
  /** What she's grown into, which lasts; tonight's warmth, gone by morning; and the two together, right now. */
  desire: number;
  warmth: number;
  desireNow: number;
  desireMax: number;
  flirt: number;
  /** The heat stirred up in the room, from the persona. */
  roomLust: number;
  tonight: { reached: number; allowed: number; refused: number; boldest: number };
  clothesLost: number;
  lets: Partial<Record<TouchRegion, number>>;
}

/** The boldness scale, as the concept names it: 1 is barely there, 10 an invitation upstairs. */
const BOLDNESS = [
  "",
  "Barely there",
  "Small and sweet",
  "Close",
  "Cheeky",
  "Bold",
  "Hands wander",
  "Over the line",
  "Heated",
  "Barely holding back",
  "The invitation",
];

const REGION_NAMES: Record<TouchRegion, string> = {
  hand: "Hands",
  face: "Face",
  hair: "Hair",
  shoulder: "Shoulders",
  waist: "Waist",
  rear: "Rear",
  chest: "Chest",
  lap: "Lap",
  lips: "Lips",
  neck: "Neck",
  thigh: "Thighs",
  clothes: "Clothes",
  invite: "Invitations",
};

/** A word for how far her desire has come. */
function desireWord(desire: number): string {
  if (desire < 2) return "Shy";
  if (desire < 4) return "Curious";
  if (desire < 6) return "Warming up";
  if (desire < 8) return "Wanting";
  if (desire < 10) return "Bold";
  return "Unashamed";
}

/** Builds the open journal at its private pages. */
export function privateBook(state: PrivateState): HTMLElement {
  const book = el("div", "journal-book private");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);

  left.append(el("h1", "title", "Private"));
  left.append(el("p", "role", "Not for anyone else's eyes."));

  left.append(el("h2", "", "Desire"));
  const max = state.desireMax;
  left.append(el("p", "reach", desireWord(state.desire)));
  left.append(row("Grown into", String(Math.round(state.desire)), { bar: meter(state.desire, 0, max, "red") }));
  left.append(row("Warm tonight", String(Math.round(state.warmth)), { bar: meter(state.warmth, 0, max, "red") }));
  left.append(row("Right now", String(Math.round(state.desireNow)), { bar: meter(state.desireNow, 0, max, "red") }));
  // A touch of boldness L needs desire L - 1 to be let happen.
  const reach = Math.min(10, Math.floor(state.desireNow) + 1);
  left.append(el("p", "note", "You'd let a guest go as far as:"));
  left.append(el("p", "reach", `${reach} · ${BOLDNESS[reach]}`));

  left.append(el("h2", "", "Reputation"));
  left.append(row("Flirt", String(state.flirt), { bar: meter(state.flirt, 0, 10, "red") }));
  left.append(row("Room's lust", String(state.roomLust), { bar: meter(state.roomLust, 0, 10, "red") }));

  right.append(el("h2", "", "Tonight"));
  if (!state.touchable) {
    right.append(el("p", "note", "Guests keep their hands to themselves with you."));
  } else {
    const t = state.tonight;
    right.append(row("Guests who reached", String(t.reached)));
    right.append(row("You let them", String(t.allowed)));
    right.append(row("You turned away", String(t.refused)));
    right.append(row("Boldest you allowed", t.boldest > 0 ? `${t.boldest} · ${BOLDNESS[t.boldest]}` : "none yet"));
    right.append(row("Clothes lost", String(state.clothesLost)));
  }

  right.append(el("h2", "", "Touches you've allowed"));
  const tally = el("div", "tally");
  for (const region of Object.keys(REGION_NAMES) as TouchRegion[]) {
    const count = state.lets[region] ?? 0;
    const chip = el("span", count > 0 ? "chip" : "chip none");
    chip.append(el("span", "", REGION_NAMES[region]), el("b", "", String(count)));
    tally.append(chip);
  }
  right.append(tally);
  const total = Object.values(state.lets).reduce((sum, n) => sum + (n ?? 0), 0);
  right.append(el("p", "note", total === 0 ? "Nobody yet." : `${total} in all, every night so far.`));
  return book;
}
