/**
 * Illustrated scenes for the story intro, drawn pixel by pixel at 320x180 and shown scaled up without
 * smoothing, so they match the game's low-resolution look. No image files are needed.
 */

export type CgName = "split" | "coins" | "letter" | "grave" | "town" | "baron";

const W = 320;
const H = 180;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered dither threshold in (0, 1) for a pixel. */
function bayer(x: number, y: number): number {
  return (BAYER4[(x & 3) + ((y & 3) << 2)] + 0.5) / 16;
}

/** Small seeded random numbers, so every scene draws the same each time. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 3x5 digits for the sums written on paper. */
const DIGITS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "5": ["111", "100", "111", "001", "111"],
  G: ["111", "100", "101", "101", "111"],
};

class Pixels {
  readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  px(x: number, y: number, color: string): void {
    this.rect(x, y, 1, 1, color);
  }

  /** Vertical blend through colour bands, dithered between neighbours. */
  gradient(y0: number, y1: number, colors: string[], x0 = 0, x1 = W): void {
    for (let y = y0; y < y1; y++) {
      const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (colors.length - 1);
      const band = Math.min(colors.length - 2, Math.floor(t));
      const blend = t - band;
      for (let x = x0; x < x1; x++) this.px(x, y, blend > bayer(x, y) ? colors[band + 1] : colors[band]);
    }
  }

  disc(cx: number, cy: number, r: number, color: string): void {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      this.rect(cx - half, cy + dy, half * 2 + 1, 1, color);
    }
  }

  /** A soft pool of light: dithered, densest at the centre. */
  glow(cx: number, cy: number, r: number, color: string, strength = 0.8): void {
    for (let y = Math.max(0, cy - r); y < Math.min(H, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d < 1 && (1 - d) * (1 - d) * strength > bayer(x, y)) this.px(x, y, color);
      }
    }
  }

  /** Fills each column from the height `top(x)` down to `bottom`. */
  ridge(top: (x: number) => number, color: string, bottom = H): void {
    for (let x = 0; x < W; x++) {
      const y = Math.round(top(x));
      this.rect(x, y, 1, bottom - y, color);
    }
  }

  /** A standing figure seen as a silhouette, feet at (x, foot). */
  figure(x: number, foot: number, height: number, color: string, bag = false): void {
    const head = Math.max(2, Math.round(height * 0.085));
    const neck = foot - height + head * 2;
    const hips = foot - height * 0.47;
    this.disc(x, foot - height + head, head, color);
    for (let y = neck; y < hips; y++) {
      const t = (y - neck) / (hips - neck);
      const half = Math.round(height * (0.12 - 0.035 * t));
      this.rect(x - half, y, half * 2 + 1, 1, color);
    }
    const leg = Math.max(2, Math.round(height * 0.065));
    this.rect(x - leg - 1, hips, leg, foot - hips, color);
    this.rect(x + 1, hips, leg, foot - hips, color);
    if (bag) this.rect(x + height * 0.14, hips - height * 0.05, height * 0.16, height * 0.14, color);
  }

  /** Text drawn with the 3x5 digit font, `scale` screen pixels per font pixel. */
  digits(text: string, x: number, y: number, scale: number, color: string): void {
    [...text].forEach((char, index) => {
      DIGITS[char]?.forEach((row, ry) =>
        [...row].forEach((bit, rx) => {
          if (bit === "1") this.rect(x + (index * 4 + rx) * scale, y + ry * scale, scale, scale, color);
        }),
      );
    });
  }

  /** Planks of a tabletop seen from above, with seams and grain. */
  planks(dark: string, light: string, seam: string, seed: number): void {
    const random = seeded(seed);
    for (let y = 0; y < H; y += 30) {
      this.rect(0, y, W, 30, (y / 30) % 2 ? dark : light);
      this.rect(0, y, W, 2, seam);
      for (let i = 0; i < 26; i++) {
        this.rect(random() * W, y + 4 + random() * 24, 10 + random() * 40, 1, seam);
      }
    }
  }

  /** A sheet of paper with a shadow and lines of handwriting. */
  paper(x: number, y: number, w: number, h: number, seed: number, ink = "#5b4630"): void {
    const random = seeded(seed);
    this.rect(x + 4, y + 4, w, h, "rgba(0,0,0,0.45)");
    this.rect(x, y, w, h, "#d6c299");
    this.rect(x, y + h - 3, w, 3, "#b9a47b");
    for (let line = y + 10; line < y + h - 12; line += 7) {
      let cursor = x + 8;
      while (cursor < x + w - 14) {
        const word = 4 + Math.floor(random() * 12);
        this.rect(cursor, line, Math.min(word, x + w - 10 - cursor), 1, ink);
        cursor += word + 3;
      }
    }
  }

  /** Darkens the corners, like an old memory. */
  vignette(strength = 0.9): void {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
        if ((d - 0.75) * strength * 1.6 > bayer(x, y)) this.px(x, y, "#050302");
      }
    }
  }
}

function candle(p: Pixels, x: number, y: number): void {
  p.glow(x, y, 70, "#3a2412", 0.55);
  p.glow(x, y, 34, "#6b4220", 0.6);
  p.rect(x - 2, y + 2, 5, 10, "#d9cba4");
  p.rect(x - 3, y + 11, 7, 2, "#8a6a40");
  p.rect(x - 1, y - 3, 3, 5, "#ffcf6a");
  p.px(x, y - 4, "#fff2c0");
}

/** Your parents' house the night your father left. */
function split(p: Pixels): void {
  p.gradient(0, 140, ["#120c09", "#22170f", "#2b1d13"]);
  p.rect(0, 140, W, 40, "#1a110b");
  for (let x = 0; x < W; x += 40) p.rect(x, 140, 1, 40, "#0f0a06");

  // The open door, rain outside.
  p.gradient(36, 140, ["#0d1424", "#1b2742", "#24345a"], 214, 268);
  const rain = seeded(3);
  for (let i = 0; i < 70; i++) {
    const rx = 214 + rain() * 54;
    const ry = 36 + rain() * 98;
    p.rect(rx, ry, 1, 4, "#4c628f");
  }
  p.rect(208, 30, 6, 110, "#3a2819");
  p.rect(268, 30, 6, 110, "#3a2819");
  p.rect(208, 30, 66, 6, "#3a2819");
  for (let y = 140; y < 180; y++) {
    const spread = (y - 140) * 0.9;
    for (let x = Math.round(214 - spread); x < 268 + spread; x++) {
      if (0.35 * (1 - (y - 140) / 40) > bayer(x, y)) p.px(x, y, "#2c3a58");
    }
  }
  p.figure(244, 140, 74, "#05070c", true);

  // Your mother at the table, head in her hands.
  candle(p, 104, 92);
  p.disc(70, 80, 7, "#0c0806");
  p.rect(60, 87, 21, 20, "#0c0806");
  p.rect(74, 78, 5, 14, "#0c0806");
  p.rect(30, 104, 110, 5, "#4a301b");
  p.rect(30, 104, 110, 1, "#6e4a2a");
  p.rect(36, 109, 5, 31, "#2e1e11");
  p.rect(129, 109, 5, 31, "#2e1e11");
  p.vignette();
}

/** The kitchen table: bills and an empty purse. */
function coins(p: Pixels): void {
  p.planks("#3e2716", "#4a2f1b", "#26170c", 11);
  candle(p, 280, 40);
  p.paper(40, 24, 110, 80, 5);
  p.rect(112, 34, 28, 2, "#8c2020");
  p.rect(112, 38, 20, 2, "#8c2020");
  p.paper(92, 56, 96, 70, 9);
  p.rect(150, 110, 30, 2, "#8c2020");
  // The purse, open and empty.
  p.disc(232, 96, 26, "#5a3a1e");
  p.disc(232, 90, 18, "#6b4626");
  p.disc(232, 84, 11, "#160d06");
  p.rect(212, 72, 40, 2, "#3a2412");
  p.rect(246, 66, 2, 8, "#c9a46a");
  // Three copper coins.
  for (const [cx, cy] of [[198, 124], [212, 130], [270, 122]]) {
    p.disc(cx, cy, 5, "#8a4f22");
    p.disc(cx - 1, cy - 1, 3, "#c27a3a");
  }
  p.vignette();
}

/** The letter with the black seal. */
function letter(p: Pixels): void {
  p.planks("#2c1c10", "#352214", "#1a1008", 21);
  p.glow(250, 50, 110, "#4a2e16", 0.5);
  candle(p, 270, 42);
  p.paper(92, 22, 140, 96, 17, "#3d2c1c");
  p.disc(162, 104, 9, "#141010");
  p.disc(160, 102, 3, "#3a3434");
  // A dried flower laid beside it.
  p.rect(60, 70, 1, 60, "#5a5236");
  p.rect(58, 96, 3, 1, "#5a5236");
  for (const [fx, fy] of [[60, 66], [56, 70], [64, 70], [60, 74]]) p.disc(fx, fy, 3, "#6d4a6e");
  p.disc(60, 70, 2, "#b49a4a");
  p.vignette();
}

function stars(p: Pixels, seed: number, bottom: number): void {
  const random = seeded(seed);
  for (let i = 0; i < 90; i++) {
    p.px(random() * W, random() * bottom, random() > 0.8 ? "#e8e4ff" : "#7c84b0");
  }
}

/** Grandma's grave on the hill. */
function grave(p: Pixels, player: number): void {
  p.gradient(0, 130, ["#05070f", "#0e1530", "#251f44"]);
  stars(p, 7, 100);
  p.glow(252, 36, 40, "#2e3560", 0.6);
  p.disc(252, 36, 13, "#e9e3c8");
  p.disc(257, 33, 11, "#cfc8ab");
  p.ridge((x) => 104 + Math.sin(x * 0.03) * 10 + Math.sin(x * 0.11) * 3, "#121831");
  p.ridge((x) => 128 - Math.sin((x / W) * Math.PI) * 14, "#090c17");

  // The headstone, flowers and a lantern.
  p.disc(170, 98, 12, "#6c6f7a");
  p.rect(158, 98, 25, 22, "#6c6f7a");
  p.rect(178, 92, 5, 28, "#4a4d57");
  p.rect(169, 94, 3, 16, "#3b3d45");
  p.rect(164, 99, 13, 3, "#3b3d45");
  for (const [fx, fy, color] of [
    [160, 120, "#b0303a"], [165, 121, "#e0c050"], [174, 120, "#d8d8e0"], [181, 121, "#b0303a"],
  ] as const) p.disc(fx, fy, 2, color);
  p.glow(132, 116, 46, "#4a3418", 0.7);
  p.rect(129, 110, 7, 9, "#2a2014");
  p.rect(130, 111, 5, 6, "#ffcf6a");

  // You, standing beside her.
  p.figure(110, 128, player === 0 ? 34 : 31, "#04060b");
  p.vignette(0.7);
}

/** Colours for the town's high street. */
interface TownPalette {
  sky: string[];
  sun: string;
  cloud: string;
  cloudShade: string;
  mountain: string;
  snow: string;
  hill: string;
  ground: string;
  road: string;
  stone: string;
  wall: string;
  wallShade: string;
  beam: string;
  roof: string[];
  window: string;
  tree: string;
  treeShade: string;
}

const DAY: TownPalette = {
  sky: ["#6fa6db", "#9cc4e8", "#cfe3f2"],
  sun: "#fff6d0",
  cloud: "#f6f9fc",
  cloudShade: "#d6e3f0",
  mountain: "#8196b3",
  snow: "#eef3fa",
  hill: "#6f9150",
  ground: "#86945a",
  road: "#b3a385",
  stone: "#8f8068",
  wall: "#e8dbbb",
  wallShade: "#c9b994",
  beam: "#4e3322",
  roof: ["#9e4a30", "#5d6474", "#8a5a34"],
  window: "#33465f",
  tree: "#4f7a36",
  treeShade: "#3b5e28",
};

interface Look {
  hair: string;
  skin: string;
  /** Shirt or blouse, including the sleeves. */
  top: string;
  /** Trousers, or the skirt when `skirt` is set. */
  legs: string;
  shoes: string;
  longHair?: boolean;
  /** A bodice laced over the lower half of the top. */
  bodice?: string;
  /** A long skirt flaring from the hips instead of trousers. */
  skirt?: boolean;
  /** Apron strings tied at the back of the waist. */
  apron?: string;
}

/** Someone seen from behind, walking up the street, in their own colours. */
function walker(p: Pixels, x: number, foot: number, height: number, look: Look): void {
  const head = Math.max(2, Math.round(height * 0.09));
  const headY = foot - height + head;
  const neck = headY + head;
  const hips = foot - height * 0.46;
  for (let y = neck; y < hips; y++) {
    const t = (y - neck) / (hips - neck);
    const half = Math.round(height * (0.12 - 0.03 * t));
    p.rect(x - half, y, half * 2 + 1, 1, look.bodice && t > 0.4 ? look.bodice : look.top);
  }
  const arm = Math.max(1, Math.round(height * 0.05));
  const shoulder = Math.round(height * 0.12);
  p.rect(x - shoulder - arm, neck + 1, arm, hips - neck, look.top);
  p.rect(x + shoulder + 1, neck + 1, arm, hips - neck, look.top);
  p.rect(x - shoulder - arm, hips, arm, 2, look.skin);
  p.rect(x + shoulder + 1, hips, arm, 2, look.skin);
  const leg = Math.max(2, Math.round(height * 0.07));
  if (look.skirt) {
    for (let y = hips; y < foot - 2; y++) {
      const half = Math.round(height * (0.1 + 0.06 * ((y - hips) / (foot - hips))));
      p.rect(x - half, y, half * 2 + 1, 1, look.legs);
    }
    if (look.apron) {
      p.rect(x - 1, hips, 3, 2, look.apron);
      p.rect(x - 2, hips + 2, 2, 3, look.apron);
      p.rect(x + 1, hips + 2, 2, 3, look.apron);
    }
  } else {
    p.rect(x - leg - 1, hips, leg, foot - hips - 1, look.legs);
    p.rect(x + 1, hips, leg, foot - hips - 1, look.legs);
  }
  p.rect(x - leg - 1, foot - 2, leg, 2, look.shoes);
  p.rect(x + 1, foot - 2, leg, 2, look.shoes);
  p.disc(x, headY, head, look.hair);
  if (look.longHair) p.rect(x - head, headY, head * 2 + 1, head + 2, look.hair);
}

/** A timber-framed house seen from the street, its gable towards you. */
function house(p: Pixels, x: number, base: number, w: number, h: number, roof: string, colors: TownPalette): void {
  p.rect(x, base - h, w, h, colors.wall);
  p.rect(x + w - 3, base - h, 3, h, colors.wallShade);
  p.rect(x, base - h, w, 2, colors.beam);
  p.rect(x, base - Math.round(h / 2), w, 2, colors.beam);
  p.rect(x, base - h, 2, h, colors.beam);
  p.rect(x + w - 2, base - h, 2, h, colors.beam);
  const rise = Math.round(w * 0.45);
  for (let row = 0; row < rise; row++) {
    const inset = Math.round((row / rise) * (w / 2 + 2));
    p.rect(x - 3 + inset, base - h - row - 1, w + 6 - inset * 2, 1, roof);
  }
  // Two windows on each floor.
  for (const floor of [base - h + 6, base - Math.round(h / 2) + 5]) {
    for (const wx of [x + Math.round(w * 0.2), x + Math.round(w * 0.62)]) {
      p.rect(wx - 1, floor - 1, 9, 9, colors.beam);
      p.rect(wx, floor, 7, 7, colors.window);
    }
  }
}

/**
 * Tarven's high street: the little market town where Grandma kept her tavern, as you walk in with your bag.
 */
function town(p: Pixels, player: number): void {
  const c = DAY;
  const horizon = 96;
  p.gradient(0, horizon, c.sky);
  p.glow(64, 26, 34, c.cloudShade, 0.5);
  p.disc(64, 26, 10, c.sun);
  for (const [cx, cy, size] of [[130, 22, 9], [250, 34, 12], [20, 48, 7]]) {
    p.disc(cx, cy + 3, size, c.cloudShade);
    p.disc(cx - size, cy + 4, size - 3, c.cloud);
    p.disc(cx, cy, size, c.cloud);
    p.disc(cx + size, cy + 3, size - 2, c.cloud);
  }

  // Mountains behind the town, where the road goes on.
  const peaks = (x: number) => 70 - Math.abs(Math.sin(x * 0.018 + 0.6)) * 28 + Math.sin(x * 0.09) * 3;
  p.ridge(peaks, c.mountain, horizon);
  for (let x = 0; x < W; x++) {
    const top = Math.round(peaks(x));
    if (top < 54) p.rect(x, top, 1, Math.min(6, 56 - top), c.snow);
  }
  p.ridge((x) => 88 + Math.sin(x * 0.04) * 4, c.hill, horizon + 2);
  p.rect(0, horizon, W, H - horizon, c.ground);

  // The cobbled street, narrowing into the distance.
  for (let y = horizon; y < H; y++) {
    const t = (y - horizon) / (H - horizon);
    const half = Math.round(8 + t * 70);
    p.rect(160 - half, y, half * 2, 1, c.road);
    const step = Math.max(3, Math.round(4 + t * 8));
    if (y % 3 === 0) for (let x = 160 - half + ((y * 7) % step); x < 160 + half; x += step) p.px(x, y, c.stone);
  }

  // Trees between the houses.
  for (const [tx, ty, r] of [[124, 92, 7], [196, 90, 8]]) {
    p.rect(tx - 1, ty, 3, 10, c.beam);
    p.disc(tx, ty, r, c.treeShade);
    p.disc(tx - 1, ty - 2, r - 2, c.tree);
  }

  // Houses down the left of the street.
  house(p, 4, 132, 58, 48, c.roof[0], c);
  house(p, 70, 112, 40, 30, c.roof[1], c);
  house(p, 112, 102, 22, 16, c.roof[2], c);
  // Grandma's tavern on the right, the biggest building in town, with its sign out.
  house(p, 212, 136, 102, 58, c.roof[2], c);
  house(p, 180, 106, 28, 20, c.roof[0], c);
  p.rect(224, 104, 16, 32, c.beam);
  p.rect(226, 106, 12, 30, "#5a3a22");
  p.rect(196, 84, 18, 2, c.beam);
  p.rect(198, 86, 1, 4, c.beam);
  p.rect(211, 86, 1, 4, c.beam);
  p.rect(194, 90, 22, 14, "#6b4423");
  p.rect(196, 92, 18, 10, "#8a5a30");
  // A painted tankard on the sign.
  p.rect(201, 94, 7, 7, "#e0c070");
  p.rect(201, 93, 7, 2, "#fff4d8");
  p.rect(208, 95, 2, 4, "#e0c070");

  // You arrive, everything you own in one bag, dressed as your character is in the game.
  if (player === 0) {
    walker(p, 158, 136, 34, { hair: "#2a1c14", skin: "#c89878", top: "#3d5a48", legs: "#4a3424", shoes: "#2a1a10" });
    p.rect(144, 116, 6, 9, "#6b4a2a");
  } else {
    walker(p, 158, 136, 31, {
      hair: "#1a1214", skin: "#e0b898", top: "#ece6dc", bodice: "#8c2a2a", legs: "#3f5a3a", skirt: true,
      apron: "#ece6dc", shoes: "#3a2616", longHair: true,
    });
    p.rect(169, 118, 5, 8, "#6b4a2a");
  }
  p.vignette(0.35);
}

/** The baron's demand: one hundred and fifty gold. */
function baron(p: Pixels): void {
  p.planks("#2c1c10", "#352214", "#1a1008", 37);
  candle(p, 274, 46);
  p.paper(70, 18, 150, 104, 41, "#3d2c1c");
  p.rect(88, 32, 114, 30, "#d6c299");
  p.digits("150G", 104, 36, 5, "#4a1410");
  p.disc(145, 104, 11, "#7a1414");
  p.disc(145, 104, 7, "#9c2020");
  // The baron's crown pressed into the wax.
  p.rect(140, 101, 2, 3, "#5a0c0c");
  p.rect(144, 100, 2, 4, "#5a0c0c");
  p.rect(148, 101, 2, 3, "#5a0c0c");
  p.rect(140, 104, 10, 3, "#5a0c0c");
  // A short stack of gold: nowhere near enough.
  for (let i = 0; i < 4; i++) {
    p.rect(248, 112 - i * 5, 22, 5, "#a8802a");
    p.rect(248, 112 - i * 5, 22, 1, "#f0d27a");
  }
  p.vignette();
}

/** Each scene's painter. `player` is the character picked (0 male, 1 female), for scenes that show you. */
const DRAW: Record<CgName, (p: Pixels, player: number) => void> = {
  split,
  coins,
  letter,
  grave,
  town,
  baron,
};

const cache = new Map<string, HTMLCanvasElement>();

/** The scene's picture, drawn on first use. */
export function drawCg(name: CgName, player: number): HTMLCanvasElement {
  const key = `${name}:${player}`;
  let canvas = cache.get(key);
  if (!canvas) {
    const pixels = new Pixels();
    DRAW[name](pixels, player);
    canvas = pixels.canvas;
    cache.set(key, canvas);
  }
  return canvas;
}
