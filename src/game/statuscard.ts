/**
 * Her status strip along the bottom of the screen, the way Karryn's Prison keeps Karryn's in view the whole time:
 * her face, her desire part by part as a row of hearts, tonight's pleasure in a long bar under them, drink over
 * willpower as big slanted gauges, and a row of chips for how she stands. Updated every frame, but only touches the
 * page when something changed.
 */
import { METER_MAX, METER_NAMES, METERS, type Meter, type Meters } from "./passives";
import { willLabel } from "./willpower";

export interface StatusState {
  name: string;
  /** Her standing sprite (see portraits.ts); the card crops her head and shoulders out of it. */
  portrait: HTMLCanvasElement | null;
  will: number;
  willMax: number;
  /** Tonight's pleasure, 0 to 100. */
  pleasure: number;
  /** How drunk she is, 0 to 1, and in a word ("" when sober). */
  drunk: number;
  drunkLabel: string;
  meters: Readonly<Meters>;
  /** Pieces of clothing off tonight. */
  piecesOff: number;
  lewdness: number;
  corruption: number;
}

/** Pleasure at which she's aroused, and on the edge (as in the after-hours game). */
const AROUSED_AT = 50;
const EDGE_AT = 80;

/** The square cropped out of the standing sprite for her face, in its pixels, and how far above her crown it starts. */
const CROP = { w: 96, h: 96 };
const HEADROOM = 6;

/** Where her face is in the standing sprite: down from the top of her head, centred on it. */
function faceCrop(portrait: HTMLCanvasElement): { x: number; y: number } {
  const ctx = portrait.getContext("2d");
  const { width, height } = portrait;
  if (!ctx || width === 0 || height === 0) return { x: 0, y: 0 };
  const alpha = ctx.getImageData(0, 0, width, height).data;
  const solid = (x: number, y: number) => alpha[(y * width + x) * 4 + 3] > 0;
  let top = 0;
  find: for (; top < height; top++) for (let x = 0; x < width; x++) if (solid(x, top)) break find;
  // Centre on her head: the middle of what's solid across the first rows down from her crown.
  let left = width;
  let right = 0;
  for (let y = top; y < Math.min(height, top + 40); y++) {
    for (let x = 0; x < width; x++) {
      if (!solid(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  const centre = right >= left ? (left + right) / 2 : width / 2;
  return {
    x: Math.round(Math.max(0, Math.min(width - CROP.w, centre - CROP.w / 2))),
    y: Math.max(0, Math.min(height - CROP.h, top - HEADROOM)),
  };
}

/** A word for how she's feeling, from her pleasure. */
export function feeling(pleasure: number): string {
  return pleasure >= EDGE_AT ? "On the edge" : pleasure >= AROUSED_AT ? "Aroused" : "Calm";
}

/** The heart the desire meters are drawn in, in a 34 x 31 box: its lobes top out at y = 1, its point at y = 29.5. */
const HEART = "M17 29.5C7 21.5 1 15.5 1 9.2A8 8 0 0 1 17 6A8 8 0 0 1 33 9.2C33 15.5 27 21.5 17 29.5Z";
const HEART_TOP = 1;
const HEART_BOTTOM = 29.5;

/** One desire meter as a heart that fills from the point up, its number in the middle and its name underneath. */
class Heart {
  readonly el = document.createElement("div");
  private readonly level: HTMLElement;
  private readonly value = document.createElement("b");
  private shown = -1;

  constructor(private readonly meter: Meter) {
    this.el.className = `heart ${meter}`;
    // The empty heart, then a filled copy in a box cut off from the top, so it shows only up to the level.
    const svg = (cls: string) =>
      `<svg class="${cls}" viewBox="0 0 34 31" aria-hidden="true"><path d="${HEART}"/>` +
      (cls === "back" ? `<path class="shine" d="M6 9.5A5 5 0 0 1 11.5 4.5"/>` : "") +
      `</svg>`;
    const holder = document.createElement("span");
    holder.className = "shape";
    holder.innerHTML = `${svg("back")}<span class="level">${svg("full")}</span>${svg("rim")}`;
    this.level = holder.querySelector<HTMLElement>(".level")!;
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = METER_NAMES[meter];
    this.el.append(holder, this.value, name);
  }

  set(n: number): void {
    if (n === this.shown) return;
    this.shown = n;
    const share = Math.max(0, Math.min(1, n / METER_MAX));
    // How far down the box the cut sits, in the heart's own 31-unit height: at its point when empty, its top when full.
    const cut = HEART_BOTTOM - share * (HEART_BOTTOM - HEART_TOP);
    this.level.style.clipPath = `inset(${((cut / 31) * 100).toFixed(1)}% 0 0 0)`;
    this.value.textContent = String(n);
    this.el.classList.toggle("lit", n > 0);
    this.el.classList.toggle("full", share >= 1);
    this.el.title = `${METER_NAMES[this.meter]} desire: ${n}/${METER_MAX}`;
  }
}

/** A slanted gauge with a letter badge, its name and a big number, like a fighting game's life bar. */
class Gauge {
  readonly el = document.createElement("div");
  private readonly fill = document.createElement("span");
  private readonly value = document.createElement("b");
  private shown = "";

  constructor(
    letter: string,
    private readonly label: string,
    tone: string,
  ) {
    this.el.className = `gauge ${tone}`;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = letter;
    const name = document.createElement("span");
    name.className = "label";
    name.textContent = label;
    this.value.className = "num";
    const track = document.createElement("span");
    track.className = "track";
    this.fill.className = "fill";
    track.append(this.fill);
    this.el.append(badge, name, this.value, track);
  }

  set(share: number, text: string, of: string, warn = false): void {
    const width = `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
    const key = `${width}|${text}|${of}|${warn}`;
    if (key === this.shown) return;
    this.shown = key;
    this.fill.style.width = width;
    this.value.textContent = text;
    this.el.classList.toggle("warn", warn);
    this.el.title = `${this.label}: ${of}`;
  }
}

export class StatusCard {
  private readonly face = document.createElement("canvas");
  private readonly feel = document.createElement("span");
  private readonly hearts = new Map<Meter, Heart>();
  private readonly pleasure = document.createElement("div");
  private readonly pleasureFill = document.createElement("span");
  private readonly pleasureValue = document.createElement("b");
  private readonly will = new Gauge("W", "Willpower", "will");
  private readonly drink = new Gauge("D", "Drink", "drink");
  private readonly tags = document.createElement("div");
  private portrait: HTMLCanvasElement | null = null;
  private shownText = "";
  private shownPleasure = -1;

  constructor(private readonly root: HTMLElement) {
    root.replaceChildren();

    // Her face in a ring.
    const who = document.createElement("div");
    who.className = "who";
    this.face.className = "face";
    this.face.width = CROP.w;
    this.face.height = CROP.h;
    who.append(this.face);

    // Desire, part by part, as a row of hearts; tonight's pleasure in a long bar under them.
    const body = document.createElement("div");
    body.className = "body";
    const hearts = document.createElement("div");
    hearts.className = "hearts";
    for (const m of METERS) {
      const heart = new Heart(m);
      this.hearts.set(m, heart);
      hearts.append(heart.el);
    }
    this.pleasure.className = "pleasure";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "Pleasure";
    const track = document.createElement("span");
    track.className = "track";
    this.pleasureFill.className = "fill";
    track.append(this.pleasureFill);
    this.pleasureValue.className = "num";
    this.pleasure.append(label, track, this.pleasureValue);
    body.append(hearts, this.pleasure);

    // Drink over willpower as big slanted gauges, and how she stands as chips under them.
    const gauges = document.createElement("div");
    gauges.className = "gauges";
    const row = document.createElement("div");
    row.className = "row";
    row.append(this.drink.el, this.will.el);
    this.tags.className = "tags";
    gauges.append(row, this.tags);

    // A chain along the bottom edge, holding the strip together.
    const chain = document.createElement("div");
    chain.className = "chain";
    root.append(who, body, gauges, chain);
  }

  update(s: StatusState): void {
    if (s.portrait !== this.portrait) {
      this.portrait = s.portrait;
      const ctx = this.face.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, CROP.w, CROP.h);
        ctx.imageSmoothingEnabled = false;
        if (s.portrait) {
          const at = faceCrop(s.portrait);
          ctx.drawImage(s.portrait, at.x, at.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
        }
      }
    }
    const feel = feeling(s.pleasure);
    const tags = [
      willLabel(s.will, s.willMax),
      s.drunkLabel,
      s.piecesOff > 0 ? `${s.piecesOff} ${s.piecesOff === 1 ? "piece" : "pieces"} off` : "Dressed",
      `Lewd ${s.lewdness}`,
      ...(s.corruption > 0 ? [`Corrupt ${s.corruption}`] : []),
    ].filter(Boolean);
    const text = `${s.name}|${feel}|${tags.join("|")}`;
    if (text !== this.shownText) {
      this.shownText = text;
      this.face.title = s.name;
      // How she feels leads the chips, coloured by how worked up she is.
      this.feel.textContent = feel;
      this.feel.className = `tag feel ${feel === "Calm" ? "calm" : feel === "Aroused" ? "aroused" : "edge"}`;
      this.tags.replaceChildren(
        this.feel,
        ...tags.map((t, i) => {
          const tag = document.createElement("span");
          tag.className = `tag t${i % 5}`;
          tag.textContent = t;
          return tag;
        }),
      );
    }
    for (const m of METERS) this.hearts.get(m)?.set(Math.floor(s.meters[m]));
    const pleasure = Math.max(0, Math.min(100, Math.floor(s.pleasure)));
    if (pleasure !== this.shownPleasure) {
      this.shownPleasure = pleasure;
      this.pleasureFill.style.width = `${pleasure}%`;
      this.pleasureValue.textContent = `${pleasure}%`;
      this.pleasure.classList.toggle("aroused", pleasure >= AROUSED_AT);
      this.pleasure.classList.toggle("edge", pleasure >= EDGE_AT);
    }
    this.will.set(s.will / Math.max(1, s.willMax), String(s.will), `${s.will}/${s.willMax}`, s.will < s.willMax / 4);
    const drunk = Math.round(s.drunk * 100);
    this.drink.set(s.drunk, String(drunk), `${s.drunkLabel || "Sober"} (${drunk}%)`, s.drunk >= 0.75);
    this.root.hidden = false;
  }
}
