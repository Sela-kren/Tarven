import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, UnsignedByteType } from "three";

/**
 * Her pubic hair: a patch of skin over her mound, built a hair's breadth out from it in its own material
 * (add_pubes in build_world.py), with its style drawn on as a cut-out. Styles are shapes, measured in metres from
 * the top of her cleft: `x` across her, `h` up her. A shape says how far inside it a point is (negative outside).
 */
export const PUBIC_MATERIAL = "T_pubic";

/** The patch's UV frame, as build_world.py lays it: model metres, u across and v up (glTF stores v flipped). */
export const PUBIC_FRAME = { half: 0.11, bottom: 0.68, top: 0.96 } as const;
/**
 * The top of her cleft, the point every style is placed from, as a height in the model: the top of her vulva's
 * slit (vulva.ts) at its usual size. 0.746 since her vulva moved down and under her (VULVA_SHIFT in build_world.py,
 * 2026-11-19); it was 0.786.
 */
export const PUBIC_CLEFT = 0.746;
/** No hair grows over the slit itself, below the top of her cleft: this far either side of her middle. */
const SLIT_HALF = 0.007;
/** The texture's size: square texels about 3.4 mm across, coarse like the rest of her. */
export const PUBIC_WIDTH = 64;
export const PUBIC_HEIGHT = 80;
/**
 * The texture it's drawn with is this many times finer (about 0.85 mm a texel) and soft: fine strands thinning out
 * at the edge, filtered smooth, so up close (a cut-in) it reads as hair, not a jagged cut-out of big square texels.
 */
export const PUBIC_FINE = 4;

type Shape = (x: number, h: number) => number;

export interface PubicStyle {
  id: string;
  label: string;
  /** null for bare: nothing drawn. */
  shape: Shape | null;
  /** How wide the thinning edge is, in metres: soft for natural hair, crisp for a shaved shape. */
  fuzz: number;
  /** How far the edge wanders, in metres: ragged for natural hair, none for a shaved shape. */
  ragged: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A polygon, its corners in order: how far inside it a point is. */
function polygon(points: readonly (readonly [number, number])[]): Shape {
  return (x, h) => {
    let best = Infinity;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ah] = points[j];
      const [bx, bh] = points[i];
      const ex = bx - ax, eh = bh - ah;
      const t = clamp(((x - ax) * ex + (h - ah) * eh) / (ex * ex + eh * eh), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - ex * t, h - ah - eh * t));
      if (ah > h !== bh > h && x < ax + ((h - ah) * ex) / eh) inside = !inside;
    }
    return inside ? best : -best;
  };
}

const circle = (cx: number, ch: number, r: number): Shape => (x, h) => r - Math.hypot(x - cx, h - ch);
const union = (...shapes: Shape[]): Shape => (x, h) => Math.max(...shapes.map((shape) => shape(x, h)));
const rounded = (shape: Shape, r: number): Shape => (x, h) => shape(x, h) + r;

/** The styles; the first is the default. */
export const PUBIC_STYLES: PubicStyle[] = [
  {
    id: "trimmed", label: "Trimmed", fuzz: 0.003, ragged: 0.0015,
    shape: rounded(polygon([[-0.044, 0.07], [0.044, 0.07], [0.005, 0.002], [-0.005, 0.002]]), 0.003),
  },
  {
    id: "natural", label: "Natural", fuzz: 0.006, ragged: 0.005,
    shape: rounded(polygon([[-0.058, 0.084], [0.058, 0.084], [0.012, -0.006], [-0.012, -0.006]]), 0.006),
  },
  {
    id: "bush", label: "Full bush", fuzz: 0.008, ragged: 0.008,
    shape: rounded(
      polygon([[-0.078, 0.1], [0.078, 0.1], [0.084, 0.07], [0.026, -0.022], [-0.026, -0.022], [-0.084, 0.07]]),
      0.008,
    ),
  },
  {
    id: "strip", label: "Landing strip", fuzz: 0.0015, ragged: 0,
    shape: rounded(polygon([[-0.006, 0.076], [0.006, 0.076], [0.006, 0.006], [-0.006, 0.006]]), 0.002),
  },
  {
    // Two lobes over a point at her cleft.
    id: "heart", label: "Heart", fuzz: 0.0015, ragged: 0,
    shape: union(circle(-0.019, 0.058, 0.021), circle(0.019, 0.058, 0.021), polygon([[-0.037, 0.05], [0.037, 0.05], [0, 0.004]])),
  },
  {
    id: "diamond", label: "Diamond", fuzz: 0.0015, ragged: 0,
    shape: polygon([[0, 0.094], [0.032, 0.05], [0, 0.006], [-0.032, 0.05]]),
  },
  {
    // A slim V pointing down to her cleft.
    id: "arrow", label: "Arrow", fuzz: 0.0015, ragged: 0,
    shape: polygon([[-0.032, 0.078], [0.032, 0.078], [0, 0.0]]),
  },
  {
    // A small square well above her cleft.
    id: "stamp", label: "Stamp", fuzz: 0.0015, ragged: 0,
    shape: rounded(polygon([[-0.016, 0.072], [0.016, 0.072], [0.016, 0.038], [-0.016, 0.038]]), 0.002),
  },
  { id: "bare", label: "Bare", shape: null, fuzz: 0, ragged: 0 },
];

/** A style by id, the first for an unknown or missing one. */
export function pubicStyle(id: string | undefined): PubicStyle {
  return PUBIC_STYLES.find((style) => style.id === id) ?? PUBIC_STYLES[0];
}

/** A steady random number from 0 to 1 for a pair of whole numbers. */
function hash(a: number, b: number): number {
  let n = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Smooth noise from 0 to 1, changing about once a unit. */
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** Where a texel's middle lies on her, from the top of her cleft. Row 0 is the frame's top, as glTF stores v. */
export function texelAt(column: number, row: number): { x: number; h: number } {
  const { half, bottom, top } = PUBIC_FRAME;
  const u = (column + 0.5) / PUBIC_WIDTH;
  const v = 1 - (row + 0.5) / PUBIC_HEIGHT;
  return { x: (u - 0.5) * 2 * half, h: bottom + v * (top - bottom) - PUBIC_CLEFT };
}

/**
 * A style drawn as RGBA, PUBIC_WIDTH by PUBIC_HEIGHT, row 0 at the top: alpha 255 where hair grows and 0 where it
 * doesn't, thinning out in a scatter towards the edge; the colour a light-and-dark speckle of strands, which the
 * material's colour tints. `size` from -1 to 1 shrinks or grows the shape about her cleft.
 */
export function drawPubes(style: PubicStyle, size = 0): Uint8Array {
  const data = new Uint8Array(PUBIC_WIDTH * PUBIC_HEIGHT * 4);
  const scale = 1 + 0.3 * clamp(size, -1, 1);
  for (let row = 0; row < PUBIC_HEIGHT; row++) {
    for (let column = 0; column < PUBIC_WIDTH; column++) {
      const at = (row * PUBIC_WIDTH + column) * 4;
      const { x, h } = texelAt(column, row);
      let alpha = 0;
      if (style.shape) {
        let d = style.shape(x / scale, h / scale) * scale;
        if (style.ragged) d += style.ragged * (noise(x / 0.011, h / 0.011) * 2 - 1);
        // Full inside, scattering out across the fuzz; never over the slit, where only her outer lips grow it.
        const cover = h < 0.002 && Math.abs(x) < SLIT_HALF ? 0 : style.fuzz > 0 ? clamp(0.5 + d / style.fuzz, 0, 1) : d > 0 ? 1 : 0;
        // The scatter is mirrored, so a shaved shape comes out even on both sides.
        alpha = hash(Math.min(column, PUBIC_WIDTH - 1 - column) + 977, row + 131) < cover ? 255 : 0;
      }
      // Strands: mostly the hair's own colour, some lighter where the light catches them, some darker between.
      const shade = Math.round(200 + 55 * hash(column, row));
      data[at] = shade;
      data[at + 1] = shade;
      data[at + 2] = shade;
      data[at + 3] = alpha;
    }
  }
  return data;
}

/**
 * A style drawn soft for her texture, PUBIC_FINE times finer than drawPubes: alpha thinning out smoothly across the
 * edge (no on-or-off scatter), broken into fine curling strands that lie down and in towards her cleft; the colour
 * lighter along each strand and darker between, which the material's colour tints.
 */
export function drawSoftPubes(style: PubicStyle, size = 0): Uint8Array {
  const width = PUBIC_WIDTH * PUBIC_FINE;
  const height = PUBIC_HEIGHT * PUBIC_FINE;
  const data = new Uint8Array(width * height * 4);
  const scale = 1 + 0.3 * clamp(size, -1, 1);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const at = (row * width + column) * 4;
      const { x, h } = texelAt((column + 0.5) / PUBIC_FINE - 0.5, (row + 0.5) / PUBIC_FINE - 0.5);
      let alpha = 0;
      let shade = 0.8;
      if (style.shape) {
        let d = style.shape(x / scale, h / scale) * scale;
        if (style.ragged) d += style.ragged * (noise(x / 0.011, h / 0.011) * 2 - 1);
        const fuzz = Math.max(0.0012, style.fuzz);
        let cover = clamp(0.5 + d / fuzz, 0, 1);
        // Never over the slit, fading out beside it.
        if (h < 0.002) cover *= clamp((Math.abs(x) - SLIT_HALF * 0.6) / (SLIT_HALF * 0.8), 0, 1);
        // Strands: fine stretched noise, lying down and in towards her middle (each side leaning its own way), their
        // way wandering a little.
        const lean = Math.sign(x || 1) * (0.45 + 0.4 * (noise(x / 0.02 + 5, h / 0.02) - 0.5));
        const along = h * Math.cos(lean) + x * Math.sin(lean);
        const across = x * Math.cos(lean) - h * Math.sin(lean);
        const strand = noise(across / 0.0005 + 2 * noise(x / 0.005, h / 0.005), along / 0.005);
        const curl = noise(across / 0.0008 + 17, along / 0.003 + 4);
        const hair = clamp((Math.max(strand, curl * 0.9) - 0.3) / 0.45, 0, 1);
        // Denser in the middle of the shape, a thin scatter of strands at its edge.
        alpha = cover * (0.45 + 0.55 * hair) * (0.5 + 0.5 * cover);
        shade = 0.75 + 0.25 * hair;
      }
      const value = Math.round(255 * shade);
      data[at] = value;
      data[at + 1] = value;
      data[at + 2] = value;
      data[at + 3] = Math.round(255 * clamp(alpha, 0, 1));
    }
  }
  return data;
}

const textures = new Map<string, DataTexture>();

/** A style's texture at a size, made once and shared: drawn soft and fine (drawSoftPubes), filtered smooth. */
export function pubicTexture(style: PubicStyle, size = 0): DataTexture {
  const step = Math.round(clamp(size, -1, 1) * 10) / 10;
  const key = `${style.id}|${step}`;
  let texture = textures.get(key);
  if (!texture) {
    texture = new DataTexture(drawSoftPubes(style, step), PUBIC_WIDTH * PUBIC_FINE, PUBIC_HEIGHT * PUBIC_FINE, RGBAFormat, UnsignedByteType);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    textures.set(key, texture);
  }
  return texture;
}
