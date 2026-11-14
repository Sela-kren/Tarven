import { MathUtils } from "three";
import type { TouchAnswer, TouchRegion } from "./touch";

/**
 * The comic effects over the touch panel, drawn the way an ero comic letters a close-up: her breath steaming
 * out of her mouth, a moan in a white cloud bubble ("Hnng...", "Ahh!"), glowing quiver marks beside where the
 * hand is, blush hatching on her cheeks, sweat drops at her temple, hearts drifting up, a starburst where a
 * smack lands, and focus lines closing in from the edge when she's at the edge. How worked up she is (`heat`)
 * decides which of them play and how strongly.
 */

/** What the effects need to know about the moment. */
export interface FxFacts {
  answer: TouchAnswer;
  region: TouchRegion;
  /** How worked up she is, from 0 (calm) to 1 (at the edge). */
  heat: number;
  /** A brawl, not a touch: only the hits and the sweat, nothing lewd. */
  brawl: boolean;
  /** A hit lands hard: a smack, a slap, a fist. */
  hard: boolean;
  /** She's showing the camera her face, so the blush lines and moan come from it. */
  face: boolean;
}

/** Which effects play for a moment, and how strongly. */
export interface FxPlan {
  /** Breath steaming from her mouth, 0 for none up to 1 for thick puffs. */
  steam: number;
  /** Heat rising off her skin where she's touched, 0 to 1. */
  skinSteam: number;
  quiver: boolean;
  blushLines: boolean;
  /** Sweat drops at her temple, 0 to 3. */
  sweat: number;
  /** Hearts drifting up, 0 for none. */
  hearts: number;
  burst: boolean;
  focus: boolean;
  /** Her voice in a cloud bubble, or null to leave it to the panel's own words. */
  moan: { text: string; loud: boolean } | null;
}

/** Her voice by how worked up she is: caught out, getting into it, then past holding it in. */
export const MOANS = {
  startled: ["Eep!", "Hyah!?", "Ah...!", "Hm...?"],
  soft: ["Hnng...", "Nnh~", "Haa...", "Mmh...", "Fuu..."],
  loud: ["Ahh!", "Hyaah!", "Ah♥ Ah♥", "Nnngh!!", "Haa♥"],
} as const;

/** Above this she pants: steam starts. */
const STEAM_FROM = 0.4;
/** Above this she sweats and the quiver marks show. */
const SWEAT_FROM = 0.6;
/** Above this she can't keep quiet. */
const LOUD_FROM = 0.72;
/** At the edge: focus lines and steam off her skin. */
const EDGE_FROM = 0.9;

/** How worked up a touch leaves her: by her answer, more for a bolder touch (1 to 10). */
export function touchHeat(answer: TouchAnswer, level: number): number {
  const base = { allow: 0.2, givein: 0.45, lean: 0.5, slap: 0, pull: 0 }[answer];
  if (base === 0) return 0;
  return MathUtils.clamp(base + (MathUtils.clamp(level, 1, 10) / 10) * 0.4, 0, 1);
}

/** How worked up she is in a duel's state. */
export function duelHeat(state: "calm" | "aroused" | "edge"): number {
  return { calm: 0.45, aroused: 0.75, edge: 1 }[state];
}

export function fxPlan(facts: FxFacts, pick: () => number = Math.random): FxPlan {
  const { answer, heat, brawl, hard, face } = facts;
  const lands = answer === "allow" || answer === "lean" || answer === "givein";
  const none: FxPlan = { steam: 0, skinSteam: 0, quiver: false, blushLines: false, sweat: 0, hearts: 0, burst: false, focus: false, moan: null };
  if (brawl) {
    // A fight: a starburst on a hit either way, and sweat when it's her taking it.
    return { ...none, burst: hard, sweat: hard && answer === "allow" ? 1 : 0 };
  }
  if (!lands) return { ...none, burst: hard };
  const words = heat >= LOUD_FROM ? MOANS.loud : heat >= STEAM_FROM ? MOANS.soft : MOANS.startled;
  return {
    steam: heat >= STEAM_FROM ? MathUtils.clamp((heat - STEAM_FROM + 0.15) / (1 - STEAM_FROM + 0.15), 0, 1) : 0,
    skinSteam: heat >= EDGE_FROM ? 1 : heat >= LOUD_FROM ? 0.4 : 0,
    quiver: heat >= SWEAT_FROM - 0.1,
    blushLines: face && heat >= 0.3,
    sweat: heat >= SWEAT_FROM ? (heat >= EDGE_FROM ? 3 : heat >= LOUD_FROM ? 2 : 1) : 0,
    hearts: answer === "lean" || heat >= LOUD_FROM ? 2 + Math.round(heat * 3) : 0,
    burst: hard,
    focus: heat >= EDGE_FROM,
    moan: { text: words[Math.floor(pick() * words.length) % words.length], loud: heat >= LOUD_FROM },
  };
}

/** A point on the panel, in its own pixels (200 by 150). */
export interface PanelPoint {
  x: number;
  y: number;
}

/** Where things are on the panel this frame. */
export interface FxSpots {
  mouth: PanelPoint;
  /** Her temple on the side away from the hand, for sweat. */
  temple: PanelPoint;
  cheeks: PanelPoint[];
  /** How big a cheek is on the panel, in its pixels: everything on her face is sized from it. */
  cheekSize: number;
  contact: PanelPoint;
  /** How big her body is on the panel round the touch, in its pixels. */
  bodySize: number;
}

/** A steady pseudo-random number from 0 to 1 for a seed, so a puff or a drop looks the same each frame. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const PINK = "#ff7aa8";
const DEEP_PINK = "#e8506e";
const BLUSH_INK = "rgba(200, 40, 70, 0.85)";

/**
 * The effects layer: a canvas over the panel's picture, drawn smooth on top of the dithered render the way the
 * lettering is, and the moan bubble beside it. The panel calls `draw` every frame with where things are.
 */
export class ComicFx {
  readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  /** Panel pixels to canvas pixels. */
  private readonly k: number;

  constructor(
    private readonly width: number,
    private readonly height: number,
    scale = 4,
  ) {
    this.k = scale;
    this.canvas.width = width * scale;
    this.canvas.height = height * scale;
    this.canvas.className = "fx";
    this.ctx = this.canvas.getContext("2d")!;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draws the plan at `since` seconds after the touch lands (nothing before it), with `fade` from 1 down to 0 as
   * the panel goes. `clock` keeps running even while a held panel stands still, so the steam and hearts go on.
   */
  draw(plan: FxPlan, spots: FxSpots, since: number, clock: number, fade: number): void {
    this.clear();
    if (since < 0 || fade <= 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.scale(this.k, this.k);
    ctx.globalAlpha = fade;
    const grow = MathUtils.smootherstep(since, 0, 0.6);
    if (plan.focus) this.focusLines(clock, grow);
    if (plan.skinSteam > 0) this.skinSteam(spots, clock, plan.skinSteam * grow);
    if (plan.blushLines) this.blushLines(spots, grow);
    if (plan.quiver) this.quiver(spots, clock, grow);
    if (plan.steam > 0) this.steam(spots, clock, plan.steam * grow);
    if (plan.sweat > 0) this.sweat(spots, plan.sweat, clock, grow);
    if (plan.hearts > 0) this.hearts(spots, plan.hearts, since);
    if (plan.burst) this.burst(spots, since);
    ctx.restore();
  }

  /**
   * Her breath, a puff every so often from her mouth: a soft white cloud of a few overlapping blobs that swells
   * as it drifts up and out, thinning away to nothing.
   */
  private steam(spots: FxSpots, clock: number, strength: number): void {
    const every = MathUtils.lerp(0.9, 0.45, strength);
    const life = 1.8;
    const size = spots.cheekSize;
    const first = Math.floor((clock - life) / every);
    for (let i = first; i * every <= clock; i++) {
      const age = (clock - i * every) / life;
      if (age < 0 || age > 1) continue;
      const side = hash(i) < 0.5 ? -1 : 1;
      const drift = (0.8 + hash(i + 7) * 0.6) * size;
      const x = spots.mouth.x + side * age * drift * 2.2 + Math.sin(age * 5 + i) * size * 0.25;
      const y = spots.mouth.y + size * 0.3 - age * drift * 2.8;
      const r = size * (0.6 + age * 2);
      const alpha = strength * 0.85 * Math.sin(Math.PI * Math.min(1, age * 1.4)) * (1 - age * 0.45);
      for (let b = 0; b < 4; b++) {
        const bx = x + (hash(i * 4 + b) - 0.5) * r * 1.1;
        const by = y + (hash(i * 4 + b + 2) - 0.5) * r * 0.8;
        const br = r * (0.55 + hash(i * 4 + b + 5) * 0.5);
        this.puff(bx, by, br, alpha);
      }
    }
  }

  /** Heat coming off her where she's touched: tall faint wisps that waver as they rise. */
  private skinSteam(spots: FxSpots, clock: number, strength: number): void {
    const size = spots.bodySize * 0.35;
    const life = 2.4;
    const every = 0.35;
    const first = Math.floor((clock - life) / every);
    for (let i = first; i * every <= clock; i++) {
      const age = (clock - i * every) / life;
      if (age < 0 || age > 1) continue;
      const x = spots.contact.x + (hash(i + 31) - 0.5) * size * 2.4 + Math.sin(age * 6 + i) * size * 0.3;
      const y = spots.contact.y - age * size * 3.2;
      this.puff(x, y, size * (0.4 + age * 0.8), strength * 0.3 * Math.sin(Math.PI * age));
    }
  }

  private puff(x: number, y: number, r: number, alpha: number): void {
    if (alpha <= 0.002 || r <= 0) return;
    const { ctx } = this;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 250, 248, ${alpha})`);
    g.addColorStop(0.5, `rgba(240, 236, 240, ${alpha * 0.7})`);
    g.addColorStop(1, "rgba(230, 228, 236, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Short slanted strokes across each cheek, the comic's way of drawing a blush. */
  private blushLines(spots: FxSpots, grow: number): void {
    const { ctx } = this;
    const s = spots.cheekSize;
    ctx.strokeStyle = BLUSH_INK;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.35, s * 0.09);
    for (const cheek of spots.cheeks) {
      const lines = 4;
      for (let i = 0; i < lines; i++) {
        const t = MathUtils.clamp(grow * lines - i, 0, 1);
        if (t <= 0) continue;
        const x = cheek.x + (i - (lines - 1) / 2) * s * 0.32;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.2, cheek.y - s * 0.28);
        ctx.lineTo(x + s * 0.2 - s * 0.36 * t, cheek.y - s * 0.28 + s * 0.56 * t);
        ctx.stroke();
      }
    }
  }

  /**
   * Quiver marks beside the touch: a glowing arc either side, wavering with little peaks along it and short ticks
   * flicking off its ends, redrawn a little differently every few frames so it trembles.
   */
  private quiver(spots: FxSpots, clock: number, grow: number): void {
    const { ctx } = this;
    const frame = Math.floor(clock * 12);
    const r = spots.bodySize * 1.15;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = PINK;
    ctx.shadowBlur = 4 * this.k;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * grow})`;
    ctx.lineWidth = Math.max(0.7, r * 0.05);
    for (const side of [-1, 1]) {
      const middle = side < 0 ? Math.PI : 0;
      const jitter = (hash(frame * 2 + side) - 0.5) * r * 0.12;
      const radius = r + jitter + Math.sin(clock * 9) * r * 0.05;
      const from = middle - 0.55;
      const to = middle + 0.55;
      ctx.beginPath();
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const a = MathUtils.lerp(from, to, i / steps);
        // A little peak every few steps, as if the line itself were shaking.
        const peak = i % 4 === 2 ? r * 0.1 * (0.6 + hash(frame + i) * 0.8) : 0;
        const x = spots.contact.x + Math.cos(a) * (radius + peak);
        const y = spots.contact.y + Math.sin(a) * (radius + peak) * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Ticks off the ends, pointing away from her.
      for (const a of [from - 0.12, to + 0.12]) {
        const inner = radius * 1.05;
        const outer = radius * (1.25 + hash(frame + a) * 0.12);
        ctx.beginPath();
        ctx.moveTo(spots.contact.x + Math.cos(a) * inner, spots.contact.y + Math.sin(a) * inner * 0.9);
        ctx.lineTo(spots.contact.x + Math.cos(a) * outer, spots.contact.y + Math.sin(a) * outer * 0.9);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Drops of sweat at her temple, each running down a little way and fading, then another. */
  private sweat(spots: FxSpots, count: number, clock: number, grow: number): void {
    const { ctx } = this;
    const s = spots.cheekSize;
    for (let i = 0; i < count; i++) {
      const life = 1.6 + hash(i + 50) * 0.6;
      const age = ((clock + i * 0.55) % life) / life;
      const x = spots.temple.x + (i - (count - 1) / 2) * s * 0.9 + (hash(i + 3) - 0.5) * s * 0.4;
      const y = spots.temple.y + (i % 2) * s * 0.5 + age * s * 1.4;
      const size = s * (0.5 + hash(i + 9) * 0.25);
      const alpha = grow * Math.min(1, age * 6) * (1 - MathUtils.smoothstep(age, 0.7, 1));
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(x, y);
      // A teardrop, point up.
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(size * 0.55, -size * 0.25, size * 0.6, size * 0.55, 0, size * 0.6);
      ctx.bezierCurveTo(-size * 0.6, size * 0.55, -size * 0.55, -size * 0.25, 0, -size);
      ctx.fillStyle = "rgba(190, 230, 255, 0.95)";
      ctx.fill();
      ctx.lineWidth = Math.max(0.3, size * 0.14);
      ctx.strokeStyle = "#2a3a5a";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(-size * 0.15, size * 0.12, size * 0.12, size * 0.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Hearts that pop out beside her and float up, swaying, before they fade. */
  private hearts(spots: FxSpots, count: number, since: number): void {
    const { ctx } = this;
    const s = spots.cheekSize;
    const life = 1.6;
    // A new heart every so often, from round the touch and her face, for as long as the panel's up.
    const every = 1.8 / count;
    const first = Math.max(0, Math.floor((since - life) / every));
    for (let i = first; i * every <= since; i++) {
      const age = (since - i * every - 0.2) / life;
      if (age < 0 || age > 1) continue;
      const from = hash(i + 70) < 0.5 ? spots.contact : spots.mouth;
      const x = from.x + (hash(i + 11) - 0.3) * s * 5 + Math.sin(age * 7 + i) * s * 0.6;
      const y = from.y - s * 1.2 - age * s * 4;
      const pop = age < 0.15 ? MathUtils.smootherstep(age, 0, 0.15) * 1.3 : 1.3 - Math.min(0.3, (age - 0.15) * 2);
      const size = s * (0.75 + hash(i + 23) * 0.6) * pop;
      ctx.save();
      ctx.globalAlpha *= 1 - MathUtils.smoothstep(age, 0.6, 1);
      ctx.translate(x, y);
      ctx.rotate((hash(i + 41) - 0.5) * 0.7);
      heartPath(ctx, size);
      ctx.fillStyle = hash(i + 5) < 0.3 ? "#fff0f6" : DEEP_PINK;
      ctx.fill();
      ctx.lineWidth = Math.max(0.3, size * 0.16);
      ctx.strokeStyle = "#5a0f22";
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Where a smack or a fist lands: a spiky white star that bursts out and is gone, with lines flying off it. */
  private burst(spots: FxSpots, since: number): void {
    const age = since / 0.45;
    if (age < 0 || age > 1) return;
    const { ctx } = this;
    const r = spots.bodySize * (0.6 + MathUtils.smootherstep(age, 0, 0.35) * 0.9);
    const { x, y } = spots.contact;
    ctx.save();
    ctx.globalAlpha *= 1 - MathUtils.smoothstep(age, 0.5, 1);
    ctx.beginPath();
    const points = 12;
    for (let i = 0; i < points * 2; i++) {
      const a = (i / (points * 2)) * Math.PI * 2 + 0.2;
      const reach = i % 2 === 0 ? r * (0.9 + hash(i) * 0.4) : r * 0.45;
      const px = x + Math.cos(a) * reach;
      const py = y + Math.sin(a) * reach;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 252, 230, 0.92)";
    ctx.fill();
    ctx.lineWidth = Math.max(0.5, r * 0.06);
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = Math.max(0.4, r * 0.04);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + hash(i + 3);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
      ctx.lineTo(x + Math.cos(a) * r * (1.7 + age), y + Math.sin(a) * r * (1.7 + age));
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Thin wedges closing in from the panel's edge and leaving the middle clear, flickering. */
  private focusLines(clock: number, grow: number): void {
    const { ctx, width, height } = this;
    const frame = Math.floor(clock * 10);
    const cx = width / 2;
    const cy = height / 2;
    const outer = Math.hypot(width, height) / 2 + 4;
    const lines = 46;
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 245, ${0.32 * grow})`;
    for (let i = 0; i < lines; i++) {
      const a = (i / lines) * Math.PI * 2 + hash(i + frame * 0.37) * 0.1;
      const inner = outer * (0.62 + hash(i * 3 + frame) * 0.22);
      const spread = 0.012 + hash(i + 17) * 0.02;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a - spread) * outer, cy + Math.sin(a - spread) * outer);
      ctx.lineTo(cx + Math.cos(a + spread) * outer, cy + Math.sin(a + spread) * outer);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function heartPath(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.8, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.8, -s * 1.15, s * 1.4, -s * 0.1, 0, s * 0.9);
  ctx.closePath();
}

/**
 * The outline of a moan bubble: a round cloud whose edge wobbles in and out, a little spikier when she's loud.
 * An SVG path in a 100 by 100 box.
 */
export function bubblePath(loud: boolean, pick: () => number = Math.random): string {
  const points = loud ? 16 : 11;
  const wobble = loud ? 0.12 : 0.07;
  const corners: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 44 * (1 - wobble + pick() * wobble * 2);
    corners.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.92]);
  }
  // Smooth through the midpoints, so it's a soft lumpy cloud rather than a polygon.
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2].map((v) => v.toFixed(1)).join(" ");
  let d = `M ${mid(corners[points - 1], corners[0])}`;
  for (let i = 0; i < points; i++) {
    const c = corners[i];
    d += ` Q ${c[0].toFixed(1)} ${c[1].toFixed(1)} ${mid(c, corners[(i + 1) % points])}`;
  }
  return `${d} Z`;
}

/** A moan bubble's element: the cloud, its sheen, and her voice lettered in it. */
export function makeMoanBubble(text: string, loud: boolean): HTMLElement {
  const el = document.createElement("div");
  el.className = `sfx moan${loud ? " loud" : ""}`;
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  const id = `moan-${Math.random().toString(36).slice(2, 8)}`;
  const defs = document.createElementNS(svgNs, "defs");
  const gradient = document.createElementNS(svgNs, "radialGradient");
  gradient.setAttribute("id", id);
  gradient.setAttribute("cx", "42%");
  gradient.setAttribute("cy", "38%");
  gradient.setAttribute("r", "65%");
  for (const [offset, color] of [
    ["0%", "#ffffff"],
    ["65%", "#f2eff2"],
    ["100%", "#cfc9d0"],
  ]) {
    const stop = document.createElementNS(svgNs, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    gradient.append(stop);
  }
  defs.append(gradient);
  const cloud = document.createElementNS(svgNs, "path");
  cloud.setAttribute("d", bubblePath(loud));
  cloud.setAttribute("fill", `url(#${id})`);
  cloud.setAttribute("stroke", "#6e1626");
  cloud.setAttribute("stroke-width", "3");
  cloud.setAttribute("stroke-linejoin", "round");
  svg.append(defs, cloud);
  const words = document.createElement("span");
  words.textContent = text;
  el.append(svg, words);
  return el;
}
