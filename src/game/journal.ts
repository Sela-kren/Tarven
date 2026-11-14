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
import { CUM_NAMES, CUM_SPOTS } from "./cum";
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
import { bonusText, TITLE_BY_ID, TITLES } from "./titles";
import {
  ACT_SKILLS,
  BODY_SKILLS,
  levelOf,
  levelProgress,
  skillBonusText,
  statBonusText,
  STATS,
  type Experience,
  type SkillId,
  type StatId,
} from "./skills";

export interface JournalState {
  name: string;
  /** Which night it is, from 1. */
  night: number;
  gold: number;
  /** What she owes the Baron (0 once paid), and whether she promised Pell the book instead. */
  debt: number;
  promised?: boolean;
  /** The Village Ledger (STORY.md, Chapter 1): her fans and place, and each house with what became of it. */
  fans?: number;
  rank?: number;
  houses?: readonly { name: string; boss: string; fans: number; fate?: "partner" | "ruin" | "fallen" }[];
  /** What she carries for things gone badly (debuffs.ts): name, what it does, how long it lasts. */
  debuffs?: readonly { name: string; detail: string; lasts: string }[];
  trust: number;
  trustMax: number;
  /** Trust at which the village rises against the baron. */
  trustToRise: number;
  heat: number;
  heatMax: number;
  persona: Persona;
  lewdness: number;
  corruption: number;
  /** What's still to come of favors: promises she's made, and favors owed her (favors.ts). */
  favors?: readonly { kind: "promise" | "return"; note: string }[];
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
  left.append(name, el("p", "role", `Innkeeper of Tarven · Night ${state.night}`));

  left.append(el("h2", "", "Ledger"));
  left.append(row("Gold", String(state.gold), { icon: COIN }));
  if (state.promised) {
    left.append(el("p", "note danger", "You promised Pell the book. He'll keep asking."));
  } else if (state.debt > 0) {
    left.append(row("Owed to the Baron", String(state.debt), { icon: SCROLL }));
    left.append(el("p", "note", "Pell collects at the story's turns, a hundred at a time once the debt's doubled."));
  } else {
    left.append(el("p", "note good", "The Baron's debt is paid."));
  }

  // The Village Ledger: where she stands among Tarven's houses, and what became of the ones she passed.
  if (state.fans !== undefined && state.houses) {
    left.append(el("h2", "", "The Village Ledger"));
    left.append(row("Your fans", String(state.fans), { bar: meter(state.fans, 0, 500, "green") }));
    left.append(el("p", "note", `You're ${["", "1st", "2nd", "3rd", "4th", "5th", "6th"][state.rank ?? 6]} of 6 in Tarven.`));
    for (const house of state.houses) {
      const fate = house.fate === "partner" ? "partnered" : house.fate === "ruin" ? "ruined" : house.fate === "fallen" ? "passed" : `${house.fans} fans`;
      left.append(row(house.name, fate));
    }
  }

  // Debuffs: what went badly, and what it's costing her (Karryn-style).
  const debuffs = state.debuffs ?? [];
  if (debuffs.length > 0) {
    left.append(el("h2", "", "What you carry"));
    for (const d of debuffs) left.append(el("p", "note danger", `${d.name}: ${d.detail}. ${d.lasts}`));
  }

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
  left.append(el("p", state.heat >= state.heatMax - 2 ? "note danger" : "note", `At ${state.heatMax} the garrison raids the tavern.`));

  // Promises she's made and favors owed her: someone will come for each, on a later night.
  const favors = state.favors ?? [];
  if (favors.length > 0) {
    left.append(el("h2", "", "Your word, and what's owed"));
    for (const f of favors) left.append(el("p", f.kind === "promise" ? "note danger" : "note", `${f.kind === "promise" ? "Promised" : "Owed"}: ${f.note}`));
  }

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

/** The boldness scale, as the concept names it: 1 is barely there, 10 adult play. */
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
  "Adult play",
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
  invite: "Adult play",
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

/** One passive written out in full: its name, what earns it and how close she is, what it does, and her thought. */
function passiveCard(def: PassiveDef, state: PassivesState): HTMLElement {
  const owned = state.owned.has(def.id);
  const ready = !owned && earned(def, state.facts);
  const card = el("div", owned ? "pcard owned" : ready ? "pcard ready" : "pcard");
  const [have, need] = def.progress(state.facts);
  const head = el("div", "phead");
  head.append(el("b", "pname", def.name), el("span", "pstate", owned ? "Earned" : ready ? "Tonight" : `${have}/${need}`));
  card.append(head);
  const req = el("div", "preq");
  req.append(el("span", "", def.need), meter(owned ? need : have, 0, need, owned ? "pink" : "gold"));
  card.append(req);
  card.append(el("p", "benefit", `+ ${def.benefit}`));
  if (def.cost) card.append(el("p", "cost", `- ${def.cost}`));
  if (owned) card.append(el("p", "thought", def.thought));
  return card;
}

/**
 * The passives, laid out like Karryn's list: every group down the left page with its picture and how many of its
 * passives she holds, and on the right, every passive of the picked group written out in full, earned or not.
 */
export function passivesBook(state: PassivesState): HTMLElement {
  const book = el("div", "journal-book private passives");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);
  const ownedCount = PASSIVES.filter((p) => state.owned.has(p.id)).length;
  left.append(el("h1", "title", "Passives"));
  left.append(el("p", "role", `${ownedCount} of ${PASSIVES.length} earned. New ones come as you go to bed.`));

  const list = el("div", "group-list");
  left.append(list);
  const rows = new Map<string, HTMLElement>();

  const show = (groupId: (typeof PASSIVE_GROUPS)[number]["id"]) => {
    const group = PASSIVE_GROUPS.find((g) => g.id === groupId)!;
    for (const [id, rowEl] of rows) rowEl.classList.toggle("on", id === groupId);
    const head = el("div", "group-head");
    const icon = el("span", "icon");
    icon.innerHTML = PASSIVE_ICONS[group.id];
    head.append(icon, el("h2", "", group.name));
    const cards = el("div", "pcards");
    for (const def of PASSIVES.filter((p) => p.group === group.id)) cards.append(passiveCard(def, state));
    right.replaceChildren(head, cards);
  };

  for (const group of PASSIVE_GROUPS) {
    const defs = PASSIVES.filter((p) => p.group === group.id);
    const have = defs.filter((p) => state.owned.has(p.id)).length;
    const line = el("button", "group");
    line.type = "button";
    const icon = el("span", "icon");
    icon.innerHTML = PASSIVE_ICONS[group.id];
    const pips = el("span", "pips");
    for (const def of defs) pips.append(el("span", state.owned.has(def.id) ? "pip on" : earned(def, state.facts) ? "pip ready" : "pip"));
    line.append(icon, el("span", "label", group.name), pips, el("span", "count", `${have}/${defs.length}`));
    line.addEventListener("click", () => show(group.id));
    rows.set(group.id, line);
    list.append(line);
  }

  // Open on the first group she's made any start on, or the hands.
  const started = PASSIVE_GROUPS.find((g) => PASSIVES.some((p) => p.group === g.id && (state.owned.has(p.id) || p.progress(state.facts)[0] > 0)));
  show(started?.id ?? "hands");
  return book;
}

// ---------- The titles ----------

export interface TitlesState {
  facts: PassiveFacts;
  earned: ReadonlySet<string>;
  worn: readonly string[];
  slots: number;
  /** Whether she can change them now: only while the tavern's shut. */
  canChange: boolean;
  /** Fame that opens a second slot. */
  twoSlotsFame: number;
  /** Her Level, and how far she is to the next; her Slut Level and its word. */
  level: number;
  slutLevel: number;
  slutWord: string;
  onWear: (id: string) => void;
  onTakeOff: (id: string) => void;
}

/**
 * Her titles, Karryn's: on the left, who she is (her Level and Slut Level) and what she's wearing; on the right,
 * every title written out, worn, earned or still to earn, with a button to put it on or take it off.
 */
export function titlesBook(state: TitlesState): HTMLElement {
  const book = el("div", "journal-book private passives titles");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);

  left.append(el("h1", "title", "Titles"));
  left.append(el("h2", "", "Who she is"));
  left.append(row("Level", String(state.level), { hint: "Grows with all her stats and skills together" }));
  left.append(el("p", "note", "One Level for every 3 levels her stats and skills gain. Each gives more willpower, brawl stamina and pay."));
  left.append(row("Slut Level", String(state.slutLevel), { icon: FLAME, hint: "Her lewdness, by tens" }));
  left.append(el("p", "reach", state.slutWord));

  left.append(el("h2", "", `Wearing (${state.worn.length}/${state.slots})`));
  if (state.worn.length === 0) left.append(el("p", "note", "Nothing. Pick a title on the right."));
  for (const id of state.worn) {
    const def = TITLE_BY_ID.get(id);
    if (def) left.append(row(def.name, "worn"));
  }
  left.append(
    el(
      "p",
      "note",
      `${state.slots < 2 ? `A second slot opens at fame ${state.twoSlotsFame}. ` : ""}${state.canChange ? "Change them any time the tavern's shut." : "The tavern's open: change them once it's shut."}`,
    ),
  );

  const cards = el("div", "pcards");
  for (const def of TITLES) {
    const worn = state.worn.includes(def.id);
    const have = state.earned.has(def.id);
    const card = el("div", worn ? "pcard owned" : have ? "pcard ready" : "pcard");
    const [now, need] = def.progress(state.facts);
    const head = el("div", "phead");
    head.append(el("b", "pname", def.name), el("span", "pstate", worn ? "Worn" : have ? "Earned" : `${now}/${need}`));
    card.append(head);
    const req = el("div", "preq");
    req.append(el("span", "", def.need), meter(have ? need : now, 0, need, have ? "pink" : "gold"));
    card.append(req);
    const bonus = bonusText(def.bonus);
    if (bonus) card.append(el("p", "thought", `When earned: ${bonus}`));
    card.append(el("p", "benefit", `+ ${def.worn}`));
    if (def.cost) card.append(el("p", "cost", `- ${def.cost}`));
    if (have) {
      const button = el("button", "title-action", worn ? "Take off" : "Wear");
      button.type = "button";
      button.disabled = !state.canChange;
      button.addEventListener("click", () => (worn ? state.onTakeOff(def.id) : state.onWear(def.id)));
      card.append(button);
    }
    cards.append(card);
  }
  right.append(el("h2", "", "Every title"), cards);
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
  // The Consent-off check: which side of her won out (her sub side, her dom side).
  left.append(row("Gave in (sub)", String(r.subWins)));
  left.append(row("Faced them down (dom)", String(r.domWins)));
  // Grabbed as she served: how often she broke their hold, and how often she let it stand.
  left.append(row("Grabbed at a table", String(r.grabbed)));
  left.append(row("Broke their hold", String(r.grabsBroken)));
  left.append(row("Let them hold you", String(r.grabsAllowed)));
  // Paid for a look: a peek inside her clothes, or a proper look.
  left.append(row("Let them peek", String(r.peeks)));
  left.append(row("Showed them bare", String(r.flashes)));
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
  // Every load, like Karryn's records: where, and how much.
  left.append(el("h2", "", "Cum"));
  const ml = CUM_SPOTS.reduce((n, spot) => n + (r.cum[spot] ?? 0), 0);
  left.append(row("Loads taken", String(r.loads)));
  for (const spot of CUM_SPOTS) left.append(row(CUM_NAMES[spot], `${r.cum[spot] ?? 0} ml`));
  left.append(row("In all", `${ml} ml`));

  right.append(el("h2", "", "Adult play"));
  right.append(row("Upstairs, in your room", String(r.invitations)));
  for (const act of UPSTAIRS_ACTS) right.append(row(UPSTAIRS[act].label, String(r.acts[act] ?? 0)));
  right.append(row("Kinds of guest", `${r.upstairsKinds.length}/4`));
  right.append(row("Stayed down in the taproom", String(r.taproomScenes)));
  right.append(row("Joined in, all told", String(r.taproomPartners)));
  right.append(row("Most at once", String(r.taproomMost)));
  right.append(row("Touched inside your clothes", String(r.touchedInside)));
  right.append(row("Touched on bare skin", String(r.touchedBare)));
  right.append(el("h2", "", "Work"));
  right.append(row("Orders served", String(r.served)));
  right.append(row("Bottles poured", String(r.poured)));
  right.append(row("Washed up", String(r.washed)));
  right.append(row("Drinks with guests", String(state.facts.drinks)));
  right.append(el("h2", "", "Brawls"));
  right.append(row("Won", String(r.fightsWon)));
  right.append(row("Talked down", String(r.talkedDown)));
  right.append(row("Lost", String(r.fightsLost)));
  right.append(el("h2", "", "After Hours"));
  right.append(row("Won", String(r.duelsWon)));
  right.append(row("Lost", String(r.duelsLost)));
  right.append(row("Climaxes", String(r.climaxes)));
  right.append(row("Called off", String(r.duelsStopped)));
  right.append(el("h2", "", "Secrets"));
  right.append(row("Kept", String(state.facts.protected)));
  right.append(row("Sold", String(state.facts.sold)));
  right.append(row("Told", String(state.facts.informed)));
  return book;
}

// ---------- Stats and skills ----------

export interface SkillsState {
  xp: Experience;
  /** Levels given outright by passives. */
  bonus: Partial<Record<StatId | SkillId, number>>;
  /** Whether guests touch the player at all: the body skills only grow for the sister, for now. */
  touchable: boolean;
}

/** One stat or skill: its name and level, a bar to the next level, and what its level does. */
function skillLine(name: string, xp: number, bonus: number, does: string): HTMLElement {
  const level = levelOf(xp) + bonus;
  const progress = levelProgress(xp);
  const line = el("div", "skill");
  const head = el("div", "skill-head");
  head.append(el("span", "skill-name", name), el("b", "skill-level", `Lv ${level}${bonus > 0 ? ` (+${bonus})` : ""}`));
  const bar = progress ? meter(progress[0], 0, progress[1], "gold") : meter(1, 0, 1, "green");
  line.append(head, bar, el("p", "skill-does", does));
  return line;
}

/**
 * Her stats and skills, like Karryn's: each has a level that grows with use, and some passives give a level
 * outright. Stats on the left, what she's practised on the right.
 */
export function skillsBook(state: SkillsState): HTMLElement {
  const book = el("div", "journal-book skills");
  const left = el("div", "page left");
  const right = el("div", "page right");
  book.append(left, el("div", "spine"), right);
  const xp = (id: StatId | SkillId) => state.xp[id] ?? 0;
  const bonus = (id: StatId | SkillId) => state.bonus[id] ?? 0;
  const level = (id: StatId | SkillId) => levelOf(xp(id)) + bonus(id);

  left.append(el("h1", "title", "Skills"));
  left.append(el("p", "role", "Everything gets better with practice."));
  left.append(el("h2", "", "Stats"));
  for (const stat of STATS) {
    left.append(skillLine(stat.name, xp(stat.id), bonus(stat.id), `${stat.does}. ${statBonusText(stat.id, level(stat.id))}.`));
  }

  right.append(el("h2", "", "Body"));
  if (!state.touchable) right.append(el("p", "note", "Guests keep their hands to themselves with you."));
  const body = el("div", "skill-grid");
  for (const skill of BODY_SKILLS) body.append(skillLine(skill.name, xp(skill.id), bonus(skill.id), skillBonusText(skill.id, level(skill.id))));
  right.append(body);
  right.append(el("h2", "", "Upstairs"));
  const acts = el("div", "skill-grid");
  for (const skill of ACT_SKILLS) acts.append(skillLine(skill.name, xp(skill.id), bonus(skill.id), skillBonusText(skill.id, level(skill.id))));
  right.append(acts);
  return book;
}
