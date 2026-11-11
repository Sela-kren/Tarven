/**
 * The innkeeper's journal: an open book with your name and how you stand. The left page is the ledger and the
 * village (gold against the debt, trust and heat); the right page is what the room says about you. It's read
 * from the book on the chest in the bedroom, instead of crowding the screen with every number. More spreads
 * keep the adult side: tonight's desire and touches, her passives, and her records.
 */
import type { Persona } from "./banter";
import type { TouchRegion } from "./touchtalk";
import { COIN, FLAME, VILLAGERS } from "./hud";
import { pixelSvg } from "./icons";
import {
  corruptWord,
  earned,
  lewdWord,
  METER_MAX,
  METER_NAMES,
  METERS,
  PASSIVE_GROUPS,
  PASSIVES,
  UPSTAIRS,
  UPSTAIRS_ACTS,
  type Meters,
  type PassiveDef,
  type PassiveFacts,
} from "./passives";
import { PASSIVE_ICONS } from "./passiveicons";

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
  lewdness: number;
  corruption: number;
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
function meter(value: number, min: number, max: number, tone: "gold" | "red" | "green" | "purple" | "pink" = "gold"): HTMLElement {
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
  right.append(row("Fame", String(p.fame), { bar: meter(p.fame, 0, 100) }));
  right.append(row("Lewdness", String(state.lewdness), { bar: meter(state.lewdness, 0, 100, "red") }));
  right.append(el("p", "note", lewdWord(state.lewdness)));
  right.append(row("Corruption", String(state.corruption), { bar: meter(state.corruption, 0, 100, "purple") }));
  right.append(el("p", "note", corruptWord(state.corruption)));

  right.append(el("h2", "", "Deeds"));
  right.append(row("Drinks with guests", String(p.drinks)));
  right.append(row("Secrets kept", String(p.protected)));
  right.append(row("Told to the baron's men", String(p.informed)));
  right.append(row("Secrets sold", String(p.sold)));
  return book;
}


// ---------- The private pages ----------

/** What the private pages show: tonight's desire and touches, and every touch let happen so far. */
export interface PrivateState {
  /** Whether guests reach for the player at all; for now only the sister is touched. */
  touchable: boolean;
  lewdness: number;
  corruption: number;
  /** Tonight's desire, a meter for each part of her. */
  meters: Meters;
  pleasure: number;
  tonight: { reached: number; allowed: number; refused: number; boldest: number };
  clothesLost: number;
  lets: Partial<Record<TouchRegion, number>>;
  passivesHeld: number;
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
  intimate: "Intimate",
  invite: "Invitations",
};

/** Builds the open journal at its private pages. */
export function privateBook(state: PrivateState): HTMLElement {
  const book = el("div", "journal-book private");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);

  left.append(el("h1", "title", "Private"));
  left.append(el("p", "role", "Not for anyone else's eyes."));

  left.append(el("h2", "", "Who she's becoming"));
  left.append(row("Lewdness", String(state.lewdness), { icon: FLAME, bar: meter(state.lewdness, 0, 100, "red") }));
  left.append(el("p", "reach", lewdWord(state.lewdness)));
  left.append(row("Corruption", String(state.corruption), { bar: meter(state.corruption, 0, 100, "purple") }));
  left.append(el("p", "reach dark", corruptWord(state.corruption)));
  left.append(el("p", "note", `${state.passivesHeld} of ${PASSIVES.length} passives earned.`));

  left.append(el("h2", "", "Desire tonight"));
  for (const m of METERS) {
    left.append(row(METER_NAMES[m], String(Math.round(state.meters[m])), { bar: meter(state.meters[m], 0, METER_MAX, "pink") }));
  }
  left.append(row("Pleasure", String(Math.round(state.pleasure)), { bar: meter(state.pleasure, 0, 100, "red") }));
  left.append(el("p", "note", "Each touch needs its own desire: a kiss needs Mouth, a hand on the knee needs Pussy."));

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

// ---------- The passives ----------

/** What the passive pages need: which she holds, and the facts that say how close she is to the rest. */
export interface PassivesState {
  owned: ReadonlySet<string>;
  facts: PassiveFacts;
}

/** One passive's card, shown when its chip is picked. */
function passiveDetail(def: PassiveDef, state: PassivesState, detail: HTMLElement): void {
  const owned = state.owned.has(def.id);
  const [have, need] = def.progress(state.facts);
  const parts: HTMLElement[] = [el("b", "name", def.name)];
  parts.push(el("p", "need", owned ? `Earned: ${def.need.toLowerCase()}.` : `${def.need}. (${have}/${need})`));
  parts.push(el("p", "benefit", `+ ${def.benefit}`));
  if (def.cost) parts.push(el("p", "cost", `- ${def.cost}`));
  if (owned) parts.push(el("p", "thought", def.thought));
  detail.replaceChildren(...parts);
}

/**
 * The passives, like Karryn's list: each group is a row with its picture, and a chip for each passive in it.
 * Earned ones are coloured, the next to earn shows how close she is, and the rest stay hidden until then.
 * Picking a chip shows what it needs and what it does at the foot of the page.
 */
export function passivesBook(state: PassivesState): HTMLElement {
  const book = el("div", "journal-book private passives");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);
  const owned = PASSIVES.filter((p) => state.owned.has(p.id)).length;
  left.append(el("h1", "title", "Passives"));
  left.append(el("p", "role", `${owned} of ${PASSIVES.length} earned. Earned as you go to bed.`));
  right.append(el("h2", "", "Habits"));

  const details = [el("div", "detail"), el("div", "detail")];
  details.forEach((d) => d.append(el("p", "note", "Pick a passive to read it.")));
  let picked: HTMLElement | null = null;

  for (const group of PASSIVE_GROUPS) {
    const page = group.body ? left : right;
    const detail = group.body ? details[0] : details[1];
    const line = el("div", "group");
    const icon = el("span", "icon");
    icon.innerHTML = PASSIVE_ICONS[group.id];
    line.append(icon, el("span", "label", group.name));
    const chips = el("span", "chips");
    let hiddenFromHere = false;
    for (const def of PASSIVES.filter((p) => p.group === group.id)) {
      const has = state.owned.has(def.id);
      const chip = el("button", has ? "pchip owned" : hiddenFromHere ? "pchip hidden" : "pchip next");
      chip.type = "button";
      if (has) chip.textContent = def.name;
      else if (hiddenFromHere) chip.textContent = "???";
      else {
        const [have, need] = def.progress(state.facts);
        chip.textContent = earned(def, state.facts) ? `${def.name} · tonight` : `${have}/${need}`;
        chip.title = def.name;
        hiddenFromHere = true;
      }
      if (!chip.classList.contains("hidden")) {
        chip.addEventListener("click", () => {
          picked?.classList.remove("picked");
          picked = chip;
          chip.classList.add("picked");
          passiveDetail(def, state, detail);
        });
      }
      chips.append(chip);
    }
    line.append(chips);
    page.append(line);
  }
  left.append(details[0]);
  right.append(details[1]);
  return book;
}

// ---------- The records ----------

export interface RecordsState {
  facts: PassiveFacts;
}

/** Everything counted about her, as Karryn's records page: what passives are earned from. */
export function recordsBook(state: RecordsState): HTMLElement {
  const book = el("div", "journal-book private records");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);
  const { records: r, lets } = state.facts;
  const sum = (...regions: TouchRegion[]) => regions.reduce((n, region) => n + (lets[region] ?? 0), 0);

  left.append(el("h1", "title", "Records"));
  left.append(el("h2", "", "Touches"));
  left.append(row("Allowed, in all", String(sum(...(Object.keys(REGION_NAMES) as TouchRegion[])))));
  left.append(row("Leaned into", String(r.leans)));
  left.append(row("Pulled away", String(r.pulled)));
  left.append(row("Slapped", String(r.slapped)));
  left.append(row("Got rough", String(r.rough)));
  left.append(row("Clothes lost", String(r.clothesLost)));
  left.append(row("Nights bared", String(r.bareNights)));
  left.append(row("Nights untouched", String(r.chasteNights)));
  left.append(el("h2", "", "Desire"));
  for (const m of METERS) {
    const nights = r.maxed[m] ?? 0;
    left.append(row(`${METER_NAMES[m]} maxed`, `${nights} ${nights === 1 ? "night" : "nights"}`));
  }
  left.append(row("Overwhelmed", String(r.overwhelmed)));
  left.append(row("Eased it yourself", String(r.alone)));

  right.append(el("h2", "", "Upstairs"));
  right.append(row("Taken upstairs", String(r.invitations)));
  for (const act of UPSTAIRS_ACTS) right.append(row(UPSTAIRS[act].label, String(r.acts[act] ?? 0)));
  right.append(row("Kinds of guest", `${r.upstairsKinds.length}/4`));
  right.append(el("h2", "", "Work"));
  right.append(row("Orders served", String(r.served)));
  right.append(row("Bottles poured", String(r.poured)));
  right.append(row("Washed up", String(r.washed)));
  right.append(row("Drinks with guests", String(state.facts.drinks)));
  right.append(el("h2", "", "Secrets"));
  right.append(row("Kept", String(state.facts.protected)));
  right.append(row("Sold", String(state.facts.sold)));
  right.append(row("Told", String(state.facts.informed)));
  return book;
}
