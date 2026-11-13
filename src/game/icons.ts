import { CanvasTexture, NearestFilter, Sprite, SpriteMaterial, SRGBColorSpace, Texture } from "three";
import type { Held } from "./tavern";

/** "suds1" and "suds2" are the two frames of scrubbing at the tub; "sparkle" is a dish coming out clean. */
/** "anger" is the mark over a guest working up to a brawl. */
export type IconName = Held | "dots" | "alert" | "anger" | "arrow" | "suds1" | "suds2" | "sparkle";

type Draw = (rect: (color: string, x: number, y: number, w: number, h: number) => void) => void;

const FOAM = "#f4ead0";
const METAL = "#8d8d94";
const CRUST = "#b4752c";
const CRUMB = "#e0ac5c";
const BOWL = "#c9c1ac";
const STEW = "#7a3f16";
const INK = "#1c140e";
const GLASS = "#3a2a20";
const WATER = "#6f9fc0";
const SUDS = "#ffffff";
const SHINE = "#ffe27a";

/** A dish in the tub's water with soap bubbles over it, the bubbles at `bubbles` (x, y, size). */
const suds = (bubbles: readonly [number, number, number][]): { bubble: boolean; draw: Draw } => ({
  bubble: true,
  draw: (r) => {
    r(WATER, 2, 10, 12, 3);
    r(BOWL, 4, 8, 8, 3);
    r(BOWL, 5, 11, 6, 1);
    for (const [x, y, size] of bubbles) {
      r(INK, x - 1, y, size + 2, size);
      r(INK, x, y - 1, size, size + 2);
      r(SUDS, x, y, size, size);
    }
  },
});

/** The colour of each bottled drink, in its bottle and in the cup. */
export const DRINK_COLORS = { wine: "#8a1c2c", mead: "#e0a030", vodka: "#dfe8f0" } as const;

/** A bottle of a drink: the glass in its colour, a cork, and a pale label. */
const bottle = (color: string): { bubble: boolean; draw: Draw } => ({
  bubble: true,
  draw: (r) => {
    r(CRUST, 7, 1, 2, 2);
    r(GLASS, 7, 3, 2, 2);
    r(color, 7, 4, 2, 1);
    r(GLASS, 5, 5, 6, 9);
    r(color, 6, 6, 4, 7);
    r(FOAM, 6, 8, 4, 3);
  },
});

const ART: Record<IconName, { bubble: boolean; draw: Draw }> = {
  ale: {
    bubble: true,
    draw: (r) => {
      r(METAL, 4, 6, 7, 7);
      r(FOAM, 3, 3, 9, 3);
      r(METAL, 11, 7, 2, 1);
      r(METAL, 12, 8, 1, 3);
      r(METAL, 11, 11, 2, 1);
    },
  },
  wine: bottle(DRINK_COLORS.wine),
  mead: bottle(DRINK_COLORS.mead),
  vodka: bottle(DRINK_COLORS.vodka),
  bread: {
    bubble: true,
    draw: (r) => {
      r(CRUST, 3, 5, 10, 7);
      r(CRUST, 4, 4, 8, 1);
      r(CRUMB, 4, 6, 8, 3);
      r(INK, 6, 5, 1, 3);
      r(INK, 9, 5, 1, 3);
    },
  },
  stew: {
    bubble: true,
    draw: (r) => {
      r(FOAM, 5, 2, 1, 2);
      r(FOAM, 9, 3, 1, 2);
      r(STEW, 3, 6, 10, 2);
      r(BOWL, 2, 8, 12, 3);
      r(BOWL, 4, 11, 8, 2);
    },
  },
  cask: {
    bubble: true,
    draw: (r) => {
      r(CRUST, 4, 3, 8, 10);
      r(METAL, 4, 5, 8, 1);
      r(METAL, 4, 10, 8, 1);
    },
  },
  dirty: {
    bubble: true,
    draw: (r) => {
      r(BOWL, 2, 7, 12, 3);
      r(BOWL, 4, 10, 8, 2);
      r(STEW, 3, 7, 2, 1);
      r(STEW, 7, 8, 2, 1);
      r(STEW, 11, 7, 2, 2);
      r(BOWL, 4, 3, 8, 3);
      r(STEW, 6, 4, 2, 1);
      r(STEW, 9, 3, 1, 2);
    },
  },
  // Scrubbing: the bubbles rise and shift between the two frames.
  suds1: suds([[3, 7, 2], [7, 5, 3], [11, 7, 2], [9, 2, 2]]),
  suds2: suds([[4, 5, 2], [8, 7, 2], [11, 4, 3], [6, 2, 2]]),
  // A clean dish, shining.
  sparkle: {
    bubble: true,
    draw: (r) => {
      r(BOWL, 3, 8, 10, 3);
      r(BOWL, 4, 11, 8, 2);
      r(SUDS, 5, 9, 3, 1);
      r(SHINE, 11, 2, 1, 5);
      r(SHINE, 9, 4, 5, 1);
      r(SHINE, 3, 3, 1, 3);
      r(SHINE, 2, 4, 3, 1);
    },
  },
  dots: {
    bubble: true,
    draw: (r) => {
      r(INK, 3, 7, 2, 2);
      r(INK, 7, 7, 2, 2);
      r(INK, 11, 7, 2, 2);
    },
  },
  alert: {
    bubble: true,
    draw: (r) => {
      r("#c8200f", 7, 3, 2, 7);
      r("#c8200f", 7, 11, 2, 2);
    },
  },
  anger: {
    bubble: true,
    draw: (r) => {
      // Four red corners bent in toward the middle: a throbbing vein.
      const red = "#c8200f";
      r(red, 3, 5, 4, 2);
      r(red, 5, 3, 2, 4);
      r(red, 9, 5, 4, 2);
      r(red, 9, 3, 2, 4);
      r(red, 3, 9, 4, 2);
      r(red, 5, 9, 2, 4);
      r(red, 9, 9, 4, 2);
      r(red, 9, 9, 2, 4);
    },
  },
  arrow: {
    bubble: false,
    draw: (r) => {
      r("#ffe27a", 3, 4, 10, 2);
      r("#ffe27a", 4, 6, 8, 2);
      r("#ffe27a", 6, 8, 4, 2);
      r("#ffe27a", 7, 10, 2, 2);
    },
  },
};

const SIZE = 16;
const textures = new Map<IconName, Texture>();

const svg = (size: number, rects: string[]) =>
  `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
const svgRect = (color: string, x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;

/** An icon's art without its speech bubble, as SVG markup for the page, so the HUD matches the room. */
export function iconSvg(name: IconName): string {
  const rects: string[] = [];
  ART[name].draw((color, x, y, w, h) => rects.push(svgRect(color, x, y, w, h)));
  return svg(SIZE, rects);
}

/**
 * Pixel art drawn as text, as SVG markup: one string per row, one character per pixel, coloured by `palette`.
 * A character missing from the palette, or "." anywhere, is left clear.
 */
export function pixelSvg(rows: readonly string[], palette: Record<string, string>): string {
  const rects: string[] = [];
  rows.forEach((row, y) => {
    // Runs of the same colour along a row become one rectangle.
    for (let x = 0; x < row.length; ) {
      let end = x + 1;
      while (end < row.length && row[end] === row[x]) end++;
      const color = palette[row[x]];
      if (color) rects.push(svgRect(color, x, y, end - x, 1));
      x = end;
    }
  });
  return svg(rows.length, rects);
}

function textureFor(name: IconName): Texture {
  const existing = textures.get(name);
  if (existing) return existing;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext("2d")!;
  const rect = (color: string, x: number, y: number, w: number, h: number) => {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  };
  if (ART[name].bubble) {
    rect(INK, 1, 0, 14, 16);
    rect(INK, 0, 1, 16, 14);
    rect("#f0e4c4", 1, 1, 14, 14);
  }
  ART[name].draw(rect);

  const texture = new CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  textures.set(name, texture);
  return texture;
}

const OVERLAY_ORDER = 10;

/** A world-space icon drawn over everything else, so it can't be hidden by furniture. */
export class Icon {
  readonly sprite: Sprite;
  private current: IconName | null = null;

  constructor(size = 0.62) {
    this.sprite = new Sprite(new SpriteMaterial({ depthTest: false, transparent: true }));
    this.sprite.scale.set(size, size, 1);
    this.sprite.renderOrder = OVERLAY_ORDER;
    this.sprite.visible = false;
  }

  show(name: IconName | null): void {
    this.sprite.visible = name !== null;
    if (name === null || name === this.current) return;
    this.sprite.material.map = textureFor(name);
    this.sprite.material.needsUpdate = true;
    this.current = name;
  }
}

/** A small horizontal bar drawn over the scene, used for guest patience. */
export class PatienceBar {
  private readonly width = 0.72;
  private readonly back = new Sprite(new SpriteMaterial({ color: 0x140c08, depthTest: false }));
  private readonly fill = new Sprite(new SpriteMaterial({ depthTest: false }));

  constructor(parent: { add(...objects: Sprite[]): unknown }) {
    this.back.scale.set(this.width + 0.08, 0.14, 1);
    this.back.renderOrder = OVERLAY_ORDER;
    this.fill.center.set(0, 0.5);
    this.fill.renderOrder = OVERLAY_ORDER + 1;
    parent.add(this.back, this.fill);
    this.hide();
  }

  show(y: number, ratio: number): void {
    this.back.visible = this.fill.visible = true;
    this.back.position.set(0, y, 0);
    this.fill.position.set(-this.width / 2, y, 0);
    this.fill.scale.set(Math.max(0.001, this.width * ratio), 0.07, 1);
    this.fill.material.color.setHex(ratio > 0.5 ? 0x62d13c : ratio > 0.25 ? 0xe8b92c : 0xd9301f);
  }

  hide(): void {
    this.back.visible = this.fill.visible = false;
  }
}
