import { CanvasTexture, NearestFilter, Sprite, SpriteMaterial, SRGBColorSpace, Texture } from "three";
import type { Item } from "./tavern";

export type IconName = Item | "dots" | "alert" | "arrow" | "you";

type Draw = (rect: (color: string, x: number, y: number, w: number, h: number) => void) => void;

const FOAM = "#f4ead0";
const METAL = "#8d8d94";
const CRUST = "#b4752c";
const CRUMB = "#e0ac5c";
const BOWL = "#c9c1ac";
const STEW = "#7a3f16";
const INK = "#1c140e";

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
  arrow: {
    bubble: false,
    draw: (r) => {
      r("#ffe27a", 3, 4, 10, 2);
      r("#ffe27a", 4, 6, 8, 2);
      r("#ffe27a", 6, 8, 4, 2);
      r("#ffe27a", 7, 10, 2, 2);
    },
  },
  you: {
    bubble: false,
    draw: (r) => {
      r("#7fe0ff", 7, 4, 2, 2);
      r("#7fe0ff", 5, 6, 6, 2);
      r("#7fe0ff", 7, 8, 2, 2);
    },
  },
};

const SIZE = 16;
const textures = new Map<IconName, Texture>();

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
