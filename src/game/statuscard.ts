/**
 * Her status window in the bottom-left corner, the way Karryn's Prison keeps Karryn's in view the whole time:
 * her face, then the numbers that change through the night (willpower, pleasure, drink), her desire part by part,
 * and a row of words for how she stands. Updated every frame, but only touches the page when something changed.
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

/** One labelled bar: a track filled to how much, and the number. */
class Bar {
  readonly el = document.createElement("div");
  private readonly fill = document.createElement("span");
  private readonly value = document.createElement("b");
  private shown = "";

  constructor(label: string, tone: string) {
    this.el.className = `bar ${tone}`;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = label;
    const track = document.createElement("span");
    track.className = "track";
    this.fill.className = "fill";
    track.append(this.fill);
    this.el.append(name, track, this.value);
  }

  set(share: number, text: string, warn = false): void {
    const width = `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
    const key = `${width}|${text}|${warn}`;
    if (key === this.shown) return;
    this.shown = key;
    this.fill.style.width = width;
    this.value.textContent = text;
    this.el.classList.toggle("warn", warn);
  }
}

export class StatusCard {
  private readonly face = document.createElement("canvas");
  private readonly name = document.createElement("div");
  private readonly feel = document.createElement("div");
  private readonly will = new Bar("Will", "will");
  private readonly pleasure = new Bar("Pleasure", "pleasure");
  private readonly drink = new Bar("Drink", "drink");
  private readonly meters = new Map<Meter, Bar>();
  private readonly tags = document.createElement("div");
  private portrait: HTMLCanvasElement | null = null;
  private shownText = "";

  constructor(private readonly root: HTMLElement) {
    root.replaceChildren();
    this.face.className = "face";
    this.face.width = CROP.w;
    this.face.height = CROP.h;
    const head = document.createElement("div");
    head.className = "head";
    const who = document.createElement("div");
    who.className = "who";
    this.name.className = "name";
    this.feel.className = "feel";
    who.append(this.name, this.feel);
    head.append(this.face, who);

    const bars = document.createElement("div");
    bars.className = "bars";
    bars.append(this.will.el, this.pleasure.el, this.drink.el);

    const desire = document.createElement("div");
    desire.className = "desire";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "Desire";
    desire.append(title);
    for (const m of METERS) {
      const bar = new Bar(METER_NAMES[m], "meter");
      this.meters.set(m, bar);
      desire.append(bar.el);
    }

    this.tags.className = "tags";
    root.append(head, bars, desire, this.tags);
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
      this.name.textContent = s.name || "You";
      this.feel.textContent = feel;
      this.feel.className = `feel ${feel === "Calm" ? "calm" : feel === "Aroused" ? "aroused" : "edge"}`;
      this.tags.replaceChildren(
        ...tags.map((t) => {
          const tag = document.createElement("span");
          tag.textContent = t;
          return tag;
        }),
      );
    }
    this.will.set(s.will / Math.max(1, s.willMax), `${s.will}/${s.willMax}`, s.will < s.willMax / 4);
    this.pleasure.set(s.pleasure / 100, `${Math.floor(s.pleasure)}`, s.pleasure >= EDGE_AT);
    this.drink.set(s.drunk, s.drunkLabel || "Sober");
    for (const m of METERS) {
      const n = Math.floor(s.meters[m]);
      this.meters.get(m)?.set(n / METER_MAX, String(n));
    }
    this.root.hidden = false;
  }
}
