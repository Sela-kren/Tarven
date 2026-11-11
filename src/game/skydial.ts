/**
 * The clock at the top of the screen: a half-dome window onto the sky over Tarven, in pixel art. The sun rises
 * on the left, arcs over and sets on the right; the moon follows it round on the other side of the wheel. The
 * sky goes through dawn, day, sunset and night, stars come out, and the village's windows light up after dark.
 * Drawn on a small canvas that the page scales up without smoothing, like the rest of the game.
 */

/** The canvas size, in game pixels. */
export const DIAL_WIDTH = 96;
export const DIAL_HEIGHT = 50;
/** Where the wheel turns, at the middle of the horizon. */
const CX = 48;
const CY = 44;
/** The dome's radius, and the radius the sun and moon travel on, inside it. */
const DOME = 46;
const ORBIT = 33;

/**
 * Where the sun is on the dial at an hour of the day: it rises at 6 AM at the left of the horizon, is overhead
 * at noon, and sets at 6 PM on the right. `up` is how high it is above the horizon, negative once it's set.
 */
export function sunAt(hour: number): { x: number; y: number; up: number } {
  const angle = (Math.PI * (hour - 6)) / 12;
  return { x: CX - ORBIT * Math.cos(angle), y: CY - ORBIT * Math.sin(angle), up: Math.sin(angle) };
}

/** The moon rides the other side of the same wheel, twelve hours behind the sun. */
export function moonAt(hour: number): { x: number; y: number; up: number } {
  return sunAt(hour + 12);
}

type RGB = [number, number, number];

/** The sky at the zenith and at the horizon, through the day: [hour, top, horizon]. */
const SKY: [number, RGB, RGB][] = [
  [0, [12, 14, 34], [26, 30, 64]],
  [4.5, [16, 18, 42], [40, 36, 78]],
  [5.5, [52, 48, 104], [196, 108, 96]],
  [6.5, [96, 132, 196], [236, 156, 96]],
  [8, [92, 156, 222], [170, 210, 236]],
  [16, [92, 156, 222], [170, 210, 236]],
  [17.5, [86, 104, 176], [236, 150, 88]],
  [18.5, [56, 44, 104], [214, 96, 70]],
  [19.5, [24, 24, 60], [70, 48, 96]],
  [21, [12, 14, 34], [26, 30, 64]],
  [24, [12, 14, 34], [26, 30, 64]],
];

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function skyAt(hour: number): { top: RGB; horizon: RGB } {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < SKY.length - 1; i++) {
    const [from, top0, low0] = SKY[i];
    const [to, top1, low1] = SKY[i + 1];
    if (h >= from && h <= to) {
      const t = (h - from) / (to - from);
      return { top: lerpColor(top0, top1, t), horizon: lerpColor(low0, low1, t) };
    }
  }
  return { top: SKY[0][1], horizon: SKY[0][2] };
}

/** 5-bit colour steps, so the sky bands like the dithered scene rather than fading smoothly. */
function css([r, g, b]: RGB, shade = 1): string {
  const step = (c: number) => Math.round(Math.min(255, c * shade) / 8) * 8;
  return `rgb(${step(r)}, ${step(g)}, ${step(b)})`;
}

/** Fixed stars, in the dome's upper part. */
const STARS: [number, number][] = [
  [20, 14], [31, 7], [44, 4], [57, 9], [70, 6], [78, 17], [14, 25], [64, 18], [38, 15], [85, 27], [26, 22], [51, 20],
];

/** Mountains along the back: heights of the far range, every 4 pixels, left to right. */
const FAR = [38, 36, 33, 30, 32, 35, 31, 27, 24, 26, 30, 33, 35, 32, 29, 31, 34, 36, 35, 33, 35, 37, 38, 37, 39];
const NEAR = [42, 41, 40, 40, 39, 38, 39, 40, 41, 41, 40, 39, 40, 41, 42, 41, 40, 40, 41, 42, 42, 42, 43, 43, 44];

export class SkyDial {
  private readonly ctx: CanvasRenderingContext2D;
  /** The last hour drawn, so it only redraws when the picture would change. */
  private drawn = -1;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = DIAL_WIDTH;
    canvas.height = DIAL_HEIGHT;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Draws the sky at `hour` (0 to 24). Cheap to call every frame: it redraws only every few game minutes. */
  draw(hour: number): void {
    const step = Math.round(hour * 12) / 12;
    if (step === this.drawn) return;
    this.drawn = step;
    const { ctx } = this;
    ctx.clearRect(0, 0, DIAL_WIDTH, DIAL_HEIGHT);

    // The sky, in bands from the zenith down to the horizon.
    const { top, horizon } = skyAt(hour);
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = css(lerpColor(top, horizon, i / (bands - 1)));
      ctx.fillRect(0, Math.floor((i * CY) / bands), DIAL_WIDTH, Math.ceil(CY / bands) + 1);
    }

    // Stars, once it's dark enough.
    const sun = sunAt(hour);
    const dark = Math.max(0, Math.min(1, (-sun.up + 0.05) / 0.25));
    if (dark > 0) {
      ctx.fillStyle = css([236, 232, 210], 0.55 + dark * 0.45);
      STARS.forEach(([x, y], i) => {
        if (i / STARS.length < dark) ctx.fillRect(x, y, 1, 1);
      });
    }

    this.drawSun(sun);
    this.drawMoon(moonAt(hour));

    // The land: daylight on it, or the dark.
    const light = Math.max(0.28, Math.min(1, 0.28 + sun.up * 1.6 + 0.15));
    this.drawLand(light, dark);
    this.cutDome();
  }

  private drawSun(sun: { x: number; y: number; up: number }): void {
    if (sun.up < -0.12) return;
    const { ctx } = this;
    const x = Math.round(sun.x);
    const y = Math.round(sun.y);
    // Low in the sky it's orange; high up, gold.
    const low = sun.up < 0.25;
    ctx.fillStyle = low ? "#f08848" : "#ffe27a";
    ctx.fillRect(x - 2, y - 4, 5, 9);
    ctx.fillRect(x - 4, y - 2, 9, 5);
    ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = low ? "#c85a30" : "#d9a93a";
    ctx.fillRect(x - 1, y + 2, 4, 1);
    ctx.fillRect(x + 2, y - 1, 1, 3);
    // Rays, at the four corners.
    ctx.fillStyle = low ? "#f08848" : "#ffe27a";
    for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, -7], [0, 7], [-7, 0], [7, 0]]) {
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }

  private drawMoon(moon: { x: number; y: number; up: number }): void {
    if (moon.up < -0.12) return;
    const { ctx } = this;
    const x = Math.round(moon.x);
    const y = Math.round(moon.y);
    ctx.fillStyle = "#dfe6f5";
    ctx.fillRect(x - 2, y - 3, 5, 7);
    ctx.fillRect(x - 3, y - 2, 7, 5);
    // The bite that makes it a crescent, in the sky's own colour just beside it.
    ctx.fillStyle = this.skyBehind(x + 1, y - 1);
    ctx.fillRect(x, y - 3, 3, 5);
    ctx.fillStyle = "#a9b4cc";
    ctx.fillRect(x - 2, y + 1, 1, 1);
    ctx.fillRect(x - 1, y - 1, 1, 1);
  }

  /** The colour already drawn at a pixel, to cut the moon's crescent against. */
  private skyBehind(x: number, y: number): string {
    const [r, g, b] = this.ctx.getImageData(Math.max(0, x + 4), Math.max(0, y), 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  }

  /** Tarven: the mountains it sits under, the hills, and the village with the tavern, lit or dark. */
  private drawLand(light: number, dark: number): void {
    const { ctx } = this;
    const column = (heights: number[], color: string) => {
      ctx.fillStyle = color;
      heights.forEach((h, i) => ctx.fillRect(i * 4, h, 4, DIAL_HEIGHT - h));
    };
    // The far range, blue-grey, with snow on the peaks.
    column(FAR, css([84, 92, 128], light));
    ctx.fillStyle = css([226, 230, 240], Math.max(0.45, light));
    FAR.forEach((h, i) => {
      if (h <= 30) ctx.fillRect(i * 4 + 1, h, 2, 2);
    });
    // The near hills, green by day.
    column(NEAR, css([58, 92, 52], light));

    // The village along the bottom: houses, and the tavern with its sign, in the middle.
    const roofs = css([122, 52, 36], light);
    const walls = css([150, 120, 86], light);
    const window = dark > 0.3 ? "#ffd86a" : css([60, 48, 40], light);
    const houses: [number, number, number][] = [
      [10, 6, 5],
      [19, 5, 4],
      [62, 6, 5],
      [71, 5, 4],
      [80, 6, 5],
    ];
    for (const [x, w, h] of houses) {
      const base = DIAL_HEIGHT - 2;
      ctx.fillStyle = walls;
      ctx.fillRect(x, base - h, w, h);
      ctx.fillStyle = roofs;
      ctx.fillRect(x - 1, base - h - 2, w + 2, 2);
      ctx.fillRect(x + 1, base - h - 3, w - 2, 1);
      ctx.fillStyle = window;
      ctx.fillRect(x + Math.floor(w / 2) - 1, base - h + 2, 2, 2);
    }
    // The tavern: bigger, two windows, a chimney and a hanging sign.
    const base = DIAL_HEIGHT - 2;
    ctx.fillStyle = walls;
    ctx.fillRect(38, base - 9, 20, 9);
    ctx.fillStyle = roofs;
    ctx.fillRect(36, base - 12, 24, 3);
    ctx.fillRect(39, base - 13, 18, 1);
    ctx.fillStyle = css([90, 80, 74], light);
    ctx.fillRect(54, base - 16, 3, 4);
    ctx.fillStyle = window;
    ctx.fillRect(41, base - 6, 3, 3);
    ctx.fillRect(52, base - 6, 3, 3);
    ctx.fillStyle = css([70, 44, 24], light);
    ctx.fillRect(47, base - 5, 3, 5);
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(46, base - 9, 5, 2);

    // The road in front.
    ctx.fillStyle = css([96, 74, 50], light);
    ctx.fillRect(0, DIAL_HEIGHT - 2, DIAL_WIDTH, 2);
  }

  /**
   * Cuts the picture to the dome, pixel by pixel so its edge stays hard: clear outside, a black rim two pixels
   * wide, and a line of light wood just inside it. Below the horizon the sides run straight down.
   */
  private cutDome(): void {
    const image = this.ctx.getImageData(0, 0, DIAL_WIDTH, DIAL_HEIGHT);
    const data = image.data;
    for (let y = 0; y < DIAL_HEIGHT; y++) {
      for (let x = 0; x < DIAL_WIDTH; x++) {
        const dx = x + 0.5 - CX;
        const dy = Math.min(0, y + 0.5 - CY);
        const d = Math.hypot(dx, dy);
        const i = (y * DIAL_WIDTH + x) * 4;
        if (d > DOME) {
          data[i + 3] = 0;
        } else if (d > DOME - 2) {
          data.set([13, 8, 5, 255], i);
        } else if (d > DOME - 3) {
          data.set([138, 95, 50, 255], i);
        }
      }
    }
    this.ctx.putImageData(image, 0, 0);
  }
}
