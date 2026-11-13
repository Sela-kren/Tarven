/**
 * Pixel-art icons for the house plans: the building tools, the upgrades, and the small coin on price tags.
 * Drawn as text like the HUD's icons (one character per pixel), and some built from layers, such as floor tiles
 * with a plus badge on top.
 */
import { COIN, CUP, DISH } from "./hud";
import { DRINK_COLORS, pixelSvg } from "./icons";

const OUTLINE = "#1c140e";

const PALETTE: Record<string, string> = {
  K: OUTLINE,
  // Wood floor.
  F: "#c48a44",
  f: "#8a5a24",
  // Stone wall.
  S: "#9a958c",
  s: "#6a665e",
  // Badges: green plus, red minus.
  G: "#58d68d",
  R: "#e0533d",
  // Gold and parchment.
  Y: "#ffd23a",
  W: "#f4ead0",
  // Iron pot, stew, steam.
  I: "#4a4a52",
  i: "#7a7a84",
  B: "#9a4a1c",
  // Cushion.
  C: "#b8323a",
  c: "#e06a6a",
};

/** Stacks layers of rows, each at an offset, onto a clear square; later layers cover earlier ones. */
function layered(size: number, ...layers: [rows: string[], x: number, y: number][]): string[] {
  const grid = Array.from({ length: size }, () => Array<string>(size).fill("."));
  for (const [rows, ox, oy] of layers) {
    rows.forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (pixel !== "." && grid[oy + y]?.[ox + x] !== undefined) grid[oy + y][ox + x] = pixel;
      });
    });
  }
  return grid.map((row) => row.join(""));
}

const TILES = [
  "KKKKKKKKK",
  "KFFFKFFFK",
  "KFFfKFFfK",
  "KFffKFffK",
  "KKKKKKKKK",
  "KFFFKFFFK",
  "KFFfKFFfK",
  "KFffKFffK",
  "KKKKKKKKK",
];

const BRICKS = [
  "KKKKKKKKKK",
  "KSSSKSSSSK",
  "KsssKssssK",
  "KKKKKKKKKK",
  "KSSKSSSSKK",
  "KssKssssKK",
  "KKKKKKKKKK",
  "KSSSKSSSSK",
  "KsssKssssK",
  "KKKKKKKKKK",
];

const PLUS = ["..KKK..", "..KGK..", "KKKGKKK", "KGGGGGK", "KKKGKKK", "..KGK..", "..KKK.."];
const MINUS = [".......", ".......", "KKKKKKK", "KRRRRRK", "KKKKKKK", ".......", "......."];

export const BUILD_ICONS = {
  /** Move: arrows four ways. */
  move: pixelSvg(
    [
      ".....KK.....",
      "....KWWK....",
      "...KWWWWK...",
      "..K.KWWK.K..",
      ".KWK.WW.KWK.",
      "KWWWWWWWWWWK",
      "KWWWWWWWWWWK",
      ".KWK.WW.KWK.",
      "..K.KWWK.K..",
      "...KWWWWK...",
      "....KWWK....",
      ".....KK.....",
    ],
    PALETTE,
  ),
  floorBuy: pixelSvg(layered(12, [TILES, 0, 0], [PLUS, 5, 5]), PALETTE),
  floorSell: pixelSvg(layered(12, [TILES, 0, 0], [MINUS, 5, 5]), PALETTE),
  wallDraw: pixelSvg(layered(12, [BRICKS, 0, 0], [PLUS, 5, 5]), PALETTE),
  wallRemove: pixelSvg(layered(12, [BRICKS, 0, 0], [MINUS, 5, 5]), PALETTE),
  /** Done: a tick. */
  done: pixelSvg(
    [
      "............",
      "..........KK",
      ".........KGK",
      "........KGGK",
      ".KK....KGGK.",
      "KGGK..KGGK..",
      "KGGGKKGGK...",
      ".KGGGGGK....",
      "..KGGGK.....",
      "...KGK......",
      "....K.......",
      "............",
    ],
    PALETTE,
  ),
  /** Better tap: the keg, with a gold arrow for speed. */
  quicktap: pixelSvg(layered(12, [kegRows(), 0, 0], [["KKK....", "KYYK...", "KYYYK..", "KYYK...", "KKK...."], 7, 7]), {
    ...PALETTE,
    B: "#b4752c",
    H: "#8d8d94",
    T: "#c9c1ac",
  }),
  /** Bigger pot: an iron cauldron of stew, steaming. */
  bigpot: pixelSvg(
    [
      "...W....W...",
      "....W..W....",
      "...W....W...",
      "KKKKKKKKKKKK",
      "KiBBBBBBBBiK",
      ".KIIIIIIIIK.",
      "KKIiIIIIIIKK",
      ".KIiIIIIIIK.",
      ".KIIIIIIIIK.",
      "..KIIIIIIK..",
      "..KK....KK..",
      "............",
    ],
    PALETTE,
  ),
  /** Cushions: a plump red pillow with gold tassels. */
  cushions: pixelSvg(
    [
      "............",
      "Y..........Y",
      ".KKKKKKKKKK.",
      "KCccCCCCCCCK",
      "KCcCCCCCCCCK",
      "KCCCCKKCCCCK",
      "KCCCCKKCCCCK",
      "KCCCCCCCCCCK",
      "KCCCCCCCCCCK",
      ".KKKKKKKKKK.",
      "Y..........Y",
      "............",
    ],
    PALETTE,
  ),
  wine: bottleIcon(DRINK_COLORS.wine, "#5a0e1a"),
  mead: bottleIcon(DRINK_COLORS.mead, "#a8701c"),
  vodka: bottleIcon(DRINK_COLORS.vodka, "#9fb0c0"),
  cup: CUP,
  dish: DISH,
  coin: COIN,
  /** The Lantern (lantern.ts): a red lantern with a flame in it. */
  lantern: pixelSvg(
    [
      "....KKKK....",
      "...K....K...",
      "..KKKKKKKK..",
      "..KCCCCCCK..",
      "..KCcYYcCK..",
      "..KCYWWYCK..",
      "..KCYWWYCK..",
      "..KCcYYcCK..",
      "..KCCCCCCK..",
      "..KKKKKKKK..",
      "....KffK....",
      "............",
    ],
    PALETTE,
  ),
  /** The room upstairs: a bed with a red cover. */
  bed: pixelSvg(
    [
      "............",
      "K...........",
      "KF..........",
      "KF.KKKKKKKK.",
      "KFKWWKCCCCCK",
      "KFKWWKCCCCCK",
      "KFKKKKKKKKKK",
      "KFFFFFFFFFFK",
      "KffffffffffK",
      "KK........KK",
      "K..........K",
      "............",
    ],
    PALETTE,
  ),
  /** A house rule: a written scroll. */
  rule: pixelSvg(
    [
      "............",
      ".KKKKKKKKK..",
      "KWWWWWWWWWK.",
      ".KWKKKKKKWK.",
      ".KWWWWWWWWK.",
      ".KWKKKKKWWK.",
      ".KWWWWWWWWK.",
      ".KWKKKKKKWK.",
      ".KWWWWWWWWK.",
      "KWWWWWWWWWK.",
      ".KKKKKKKKK..",
      "............",
    ],
    PALETTE,
  ),
  /** One of the Lantern's girls: a heart. */
  heart: pixelSvg(
    [
      "............",
      "..KKK..KKK..",
      ".KCcCKKCCCK.",
      "KCcCCCCCCCCK",
      "KCCCCCCCCCCK",
      "KCCCCCCCCCCK",
      ".KCCCCCCCCK.",
      "..KCCCCCCK..",
      "...KCCCCK...",
      "....KCCK....",
      ".....KK.....",
      "............",
    ],
    PALETTE,
  ),
} as const;

/** The HUD's keg drawing, as rows, so the tap upgrade can put a badge on it. */
function kegRows(): string[] {
  return [
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
  ];
}

/** A bottle of a drink, in its colour with a darker shade down one side, a cork and a pale label. */
function bottleIcon(color: string, shade: string): string {
  return pixelSvg(
    [
      ".....KK.....",
      "....KCCK....",
      "....KGGK....",
      "....KLGK....",
      "...KKLGKK...",
      "..KLLLGGDK..",
      "..KLWWWWDK..",
      "..KLWWWWDK..",
      "..KLLGGGDK..",
      "..KLLGGGDK..",
      "..KDDDDDDK..",
      "...KKKKKK...",
    ],
    { K: OUTLINE, C: "#b4752c", G: color, L: color, D: shade, W: "#f4ead0" },
  );
}

export type BuildIcon = keyof typeof BUILD_ICONS;

/** For the upgrade ids and ware names the tavern uses. */
export const SUPPLY_ICONS: Record<string, BuildIcon> = {
  quicktap: "quicktap",
  bigpot: "bigpot",
  cushions: "cushions",
  cup: "cup",
  dish: "dish",
};
