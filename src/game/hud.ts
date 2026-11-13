/**
 * The stats in the top corner: gold, trust, heat and the tap.
 * Each stat is a small pixel-art icon with its number, drawn as SVG so it stays sharp at any size.
 */
import { pixelSvg } from "./icons";
import type { Held, PotState } from "./tavern";

export interface HudState {
  gold: number;
  debt: number;
  trust: number;
  trustMax: number;
  heat: number;
  heatMax: number;
  tap: number;
  pot: PotState;
  held: Held | null;
  /** How many of `held`: cups on the ale tray, otherwise 1. */
  count: number;
  /** Clean cups and dishes, and how many the tavern owns. */
  cups: number;
  cupsOwned: number;
  dishes: number;
  dishesOwned: number;
  traySize: number;
  /** How drunk you are, in a word, or "" when sober. */
  drunk: string;
}

const OUTLINE = "#1c140e";

export const COIN = pixelSvg(
  [
    "...KKKKKK...",
    "..KGGGGGGK..",
    ".KGLLGGGGDK.",
    "KGLGGGGGGGDK",
    "KGLGGDDGGGDK",
    "KGGGGDDGGGDK",
    "KGGGGDDGGGDK",
    "KGGGGDDGGGDK",
    "KGGGGGGGGGDK",
    ".KGGGGGGGDK.",
    "..KDDDDDDK..",
    "...KKKKKK...",
  ],
  { K: OUTLINE, G: "#ffd23a", L: "#fff3b0", D: "#c08a20" },
);

/** Trust: two villagers, shoulder to shoulder. */
export const VILLAGERS = pixelSvg(
  [
    "............",
    ".......KKK..",
    "......KHHHK.",
    "..KKK.KHHHK.",
    ".KHHHK.KKK..",
    ".KHHHKKBBBK.",
    "..KKKKBBBBBK",
    ".KGGGGKBBBBK",
    "KGGGGGGKBBBK",
    "KGGGGGGKBBBK",
    "KGGGGGGKKKKK",
    "KKKKKKKK....",
  ],
  { K: OUTLINE, B: "#8a5a2c", G: "#3f7a3a", H: "#f0c49a" },
);

export const FLAME = pixelSvg(
  [
    ".....K......",
    "....KOK.....",
    "....KOOK....",
    "...KOOOK.K..",
    "..KOOYOOKOK.",
    "..KOYYOOOOK.",
    ".KOOYYYOOOK.",
    ".KOYYWYYOOK.",
    ".KOYYWWYYOK.",
    ".KROYYYYORK.",
    "..KRROORRK..",
    "...KKKKKK...",
  ],
  { K: OUTLINE, O: "#f08a24", Y: "#ffd23a", W: "#fff3b0", R: "#c8200f" },
);

const KEG = pixelSvg(
  [
    "............",
    "..KKKKKKK...",
    ".KBBBBBBBK..",
    ".KHHHHHHHK..",
    "KBBBBBBBBBK.",
    "KBBBBBBBBBKK",
    "KBBBBBBBBBTT",
    "KBBBBBBBBBKT",
    "KBBBBBBBBBK.",
    ".KHHHHHHHK..",
    ".KBBBBBBBK..",
    "..KKKKKKK...",
  ],
  { K: OUTLINE, B: "#b4752c", H: "#8d8d94", T: "#c9c1ac" },
);

export const CUP = pixelSvg(
  [
    "............",
    ".KKKKKKKK...",
    ".KFFFFFFK...",
    ".KMMMMMMKKK.",
    ".KMLMMMMK.K.",
    ".KMLMMMMK.K.",
    ".KMLMMMMK.K.",
    ".KMMMMMMKKK.",
    ".KMMMMMMK...",
    ".KDDDDDDK...",
    ".KKKKKKKK...",
    "............",
  ],
  { K: OUTLINE, F: "#f4ead0", M: "#8d8d94", L: "#c9c9d0", D: "#5e5e66" },
);

export const DISH = pixelSvg(
  [
    "............",
    "............",
    "............",
    "KKKKKKKKKKKK",
    "KLLLLLLLLLLK",
    "KCCCCCCCCCCK",
    ".KCCCCCCCCK.",
    ".KCCCCCCCDK.",
    "..KCCCCCDK..",
    "...KKKKKK...",
    "............",
    "............",
  ],
  { K: OUTLINE, C: "#c9c1ac", L: "#f0e8d4", D: "#8a7a66" },
);

/** Willpower: a steady blue flame, like a candle that won't go out. */
export const WILL = pixelSvg(
  [
    ".....KK.....",
    "....KWBK....",
    "....KWBK....",
    "...KWWBBK...",
    "..KBWWWBBK..",
    "..KBWWWBBK..",
    "..KBBWBBDK..",
    "...KBBBDK...",
    "....KKKK....",
    "...KTTTTK...",
    "...KTTTTK...",
    "...KKKKKK...",
  ],
  { K: OUTLINE, W: "#e4f0ff", B: "#5a8ad8", D: "#36589a", T: "#c9c1ac" },
);

/** How long a change's "+5" floats over a stat before it's taken away, in milliseconds (a little over its animation). */
const DELTA_LIFE_MS = 1200;
/** Changes this close together, in milliseconds, add up in one "+7" rather than two numbers on top of each other. */
const DELTA_MERGE_MS = 500;

/**
 * One icon and its number. When the number changes it pops, flashing green for a change for the better and red for
 * the worse, and the difference ("+5", "-1") floats up off it.
 */
class Stat {
  readonly el = document.createElement("span");
  private readonly icon = document.createElement("span");
  private readonly value = document.createElement("b");
  private readonly of = document.createElement("small");
  private shown = "";
  /** The number last shown, or null before the first. */
  private last: number | null = null;
  /** The difference floating over it now, if it's recent enough to add to: its element, its total, when it began. */
  private delta: { el: HTMLElement; total: number; at: number; timer: number } | null = null;

  constructor(
    parent: HTMLElement,
    private readonly name: string,
    icon: string,
    /** Whether more is better: gold, cups and dishes are; heat isn't. */
    private readonly moreIsBetter = true,
  ) {
    this.el.className = "stat";
    this.icon.className = "icon";
    this.icon.innerHTML = icon;
    this.of.className = "of";
    this.el.append(this.icon, this.value, this.of);
    parent.append(this.el);
  }

  set(value: string, of = "", icon?: string, warn = false): void {
    const key = `${value}|${of}|${icon ?? ""}|${warn}`;
    if (key === this.shown) return;
    this.shown = key;
    this.value.textContent = value;
    this.of.textContent = of;
    if (icon) this.icon.innerHTML = icon;
    this.el.classList.toggle("warn", warn);
    this.el.title = `${this.name}: ${value}${of}`;
    this.el.setAttribute("aria-label", this.el.title);
    const number = Number(value);
    if (Number.isFinite(number)) {
      if (this.last !== null && number !== this.last) this.changed(number - this.last);
      this.last = number;
    }
  }

  /** Pops the number, and floats the difference up off it, added to the last one if that's only just begun. */
  private changed(by: number): void {
    const now = performance.now();
    const recent = this.delta && now - this.delta.at < DELTA_MERGE_MS ? this.delta : null;
    const total = (recent?.total ?? 0) + by;
    if (recent) {
      window.clearTimeout(recent.timer);
      recent.el.remove();
      this.delta = null;
    }
    // Up and back down again before it showed: nothing to tell.
    if (total === 0) return;
    const better = total > 0 === this.moreIsBetter;
    // Taken off and put back, so a second change straight after the first replays the pop.
    this.el.classList.remove("bump-better", "bump-worse");
    void this.el.offsetWidth;
    this.el.classList.add(better ? "bump-better" : "bump-worse");
    const el = document.createElement("span");
    el.className = `delta ${better ? "better" : "worse"}`;
    el.textContent = total > 0 ? `+${total}` : `−${-total}`;
    el.setAttribute("aria-hidden", "true");
    this.el.append(el);
    const timer = window.setTimeout(() => {
      el.remove();
      if (this.delta?.el === el) this.delta = null;
    }, DELTA_LIFE_MS);
    this.delta = { el, total, at: recent?.at ?? now, timer };
  }

  /** Shows or hides it. The style sheet lays stats out with display, which would beat the hidden attribute. */
  show(visible: boolean): void {
    this.el.style.display = visible ? "" : "none";
  }
}

export class StatsHud {
  private readonly gold: Stat;
  private readonly heat: Stat;
  private readonly tap: Stat;
  private readonly cups: Stat;
  private readonly dishes: Stat;
  private readonly drunk = document.createElement("span");

  constructor(root: HTMLElement) {
    root.replaceChildren();
    const row = document.createElement("div");
    row.className = "row";
    this.gold = new Stat(row, "Gold", COIN);
    // Heat only comes up here as a warning; it, trust and the rest are kept in the journal.
    this.heat = new Stat(row, "Heat", FLAME, false);
    this.tap = new Stat(row, "Ale left in the tap", KEG);
    // The tap never runs dry now, so there's nothing to count.
    this.tap.show(false);
    this.cups = new Stat(row, "Clean cups", CUP);
    this.dishes = new Stat(row, "Clean dishes", DISH);
    // A small badge after the stats while you're drunk; hidden when sober.
    this.drunk.className = "drunk";
    this.drunk.hidden = true;
    row.append(this.drunk);
    root.append(row);
  }

  update(state: HudState): void {
    // The gold you have; what you owe is in the journal.
    this.gold.set(String(state.gold));
    // The last two steps before the baron's men come show up in red, as a warning.
    const danger = state.heat >= state.heatMax - 2;
    this.heat.show(danger);
    this.heat.set(String(state.heat), `/${state.heatMax}`, undefined, danger);
    this.tap.set(String(state.tap), "", undefined, state.tap === 0);
    this.cups.set(String(state.cups), `/${state.cupsOwned}`, undefined, state.cups === 0);
    this.dishes.set(String(state.dishes), `/${state.dishesOwned}`, undefined, state.dishes === 0);
    if (this.drunk.textContent !== state.drunk) this.drunk.textContent = state.drunk;
    this.drunk.hidden = !state.drunk;
  }
}
