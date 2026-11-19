/**
 * Colour palettes the screen can be snapped to (RetroPipeline.setPalette), after Red Giraffe's "Pixel Perfect": every
 * pixel takes the nearest palette colour, nearest as the eye sees it (OKLab), so a place reads as pixel art drawn
 * in a set of hand-made colour ramps rather than as a small 3D render. See .claude/skills/pixel-perfect.
 */

/** Resurrect 64 by Kerrie Lake (lospec.com/palette-list/resurrect-64): warm, storybook ramps. */
export const RESURRECT_64: readonly string[] = [
  "2e222f", "3e3546", "625565", "966c6c", "ab947a", "694f62", "7f708a", "9babb2", "c7dcd0", "ffffff",
  "6e2727", "b33831", "ea4f36", "f57d4a", "ae2334", "e83b3b", "fb6b1d", "f79617", "f9c22b", "7a3045",
  "9e4539", "cd683d", "e6904e", "fbb954", "4c3e24", "676633", "a2a947", "d5e04b", "fbff86", "165a4c",
  "239063", "1ebc73", "91db69", "cddf6c", "313638", "374e4a", "547e64", "92a984", "b2ba90", "0b5e65",
  "0b8a8f", "0eaf9b", "30e1b9", "8ff8e2", "323353", "484a77", "4d65b4", "4d9be6", "8fd3ff", "45293f",
  "6b3e75", "905ea9", "a884f3", "eaaded", "753c54", "a24b6f", "cf657f", "ed8099", "831c5d", "c32454",
  "f04f78", "f68181", "fca790", "fdcbb0",
];

/** Endesga 64 by ENDESGA (lospec.com/palette-list/endesga-64): punchy colours with true greys. */
export const ENDESGA_64: readonly string[] = [
  "ff0040", "131313", "1b1b1b", "272727", "3d3d3d", "5d5d5d", "858585", "b4b4b4", "ffffff", "c7cfdd",
  "92a1b9", "657392", "424c6e", "2a2f4e", "1a1932", "0e071b", "1c121c", "391f21", "5d2c28", "8a4836",
  "bf6f4a", "e69c69", "f6ca9f", "f9e6cf", "edab50", "e07438", "c64524", "8e251d", "ff5000", "ed7614",
  "ffa214", "ffc825", "ffeb57", "d3fc7e", "99e65f", "5ac54f", "33984b", "1e6f50", "134c4c", "0c2e44",
  "00396d", "0069aa", "0098dc", "00cdf9", "0cf1ff", "94fdff", "fdd2ed", "f389f5", "db3ffd", "7a09fa",
  "3003d9", "0c0293", "03193f", "3b1443", "622461", "93388f", "ca52c9", "c85086", "f68187", "f5555d",
  "ea323c", "c42430", "891e2b", "571c27",
];

export const PALETTES = { resurrect: RESURRECT_64, endesga: ENDESGA_64 } as const;
export type PaletteName = keyof typeof PALETTES;

/** The most colours a palette can have: the size of the screen shader's arrays. */
export const MAX_PALETTE = 64;

/** "rrggbb" to sRGB 0..1. */
export function hexToSrgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear sRGB to OKLab (Björn Ottosson, 2020). The screen shader has the same maths. */
export function linearToOklab([r, g, b]: readonly number[]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function hexToOklab(hex: string): [number, number, number] {
  return linearToOklab(hexToSrgb(hex).map(srgbToLinear));
}

/** The palette colour nearest an sRGB colour, as the eye sees it: what the screen shader picks for a pixel. */
export function nearestInPalette(palette: readonly string[], srgb: readonly number[]): string {
  const lab = linearToOklab(srgb.map(srgbToLinear));
  let best = palette[0];
  let bestDistance = Infinity;
  for (const hex of palette) {
    const p = hexToOklab(hex);
    const d = (lab[0] - p[0]) ** 2 + (lab[1] - p[1]) ** 2 + (lab[2] - p[2]) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = hex;
    }
  }
  return best;
}

/**
 * The town's look (street.ts): its palette, and its lines on screen (null = the game's usual size; fewer = bigger
 * pixels). In development "?palette=resurrect|endesga|off" and "?lines=360" try others without changing these.
 */
// Off since 2026-11-19: snapped to Endesga 64 the town read as another game next to the tavern, which isn't snapped.
export const TOWN_LOOK: { palette: PaletteName | null; lines: number | null } = { palette: null, lines: null };

/** The town's look with any development overrides from the address. */
export function townLook(search: string, dev: boolean): { palette: readonly string[] | null; lines: number | null } {
  const params = dev ? new URLSearchParams(search) : new URLSearchParams();
  const asked = params.get("palette");
  const name = asked === "off" ? null : asked && asked in PALETTES ? (asked as PaletteName) : TOWN_LOOK.palette;
  const lines = Number(params.get("lines")) || TOWN_LOOK.lines;
  return { palette: name ? PALETTES[name] : null, lines };
}
