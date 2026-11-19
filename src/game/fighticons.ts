/**
 * Pixel-art icons for the brawl's menu: each of her moves and each group of them (Attack, Words, Recover,
 * Willpower, Stance, Intimate). Drawn as text like the build icons (buildicons.ts), one character per pixel, and
 * some built from layers, such as a heart with an arrow badge on top.
 */
import type { FightMove } from "./fight";
import { pixelSvg } from "./icons";

const PALETTE: Record<string, string> = {
  K: "#1c140e",
  W: "#f4ead0",
  // Skin, and its shade.
  S: "#e8b890",
  s: "#b8805c",
  // Hair.
  H: "#a0622c",
  h: "#6a3e18",
  // Iron.
  I: "#b4b0a6",
  i: "#6a665e",
  // Gold, blue (willpower), green (stamina), pink (desire), red.
  Y: "#ffd23a",
  B: "#5a9ee8",
  b: "#2f5aa8",
  G: "#58d68d",
  g: "#2e9a5a",
  P: "#f07aa8",
  p: "#b8406a",
  R: "#e0533d",
  // Wood, and linen.
  F: "#c48a44",
  f: "#8a5a24",
  C: "#d8c8a0",
  c: "#a89870",
};

/** Stacks layers of rows, each at an offset, onto a clear square; later layers cover earlier ones. */
function layered(size: number, ...layers: [rows: readonly string[], x: number, y: number][]): string[] {
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

/** Swaps the colours of a drawing, character for character ("PG": every P becomes G). */
function recolor(rows: readonly string[], ...swaps: string[]): string[] {
  const map = new Map(swaps.map((s) => [s[0], s[1]] as const));
  return rows.map((row) => [...row].map((c) => map.get(c) ?? c).join(""));
}

const FIST = [
  "............",
  "...KKKKKK...",
  "..KSSKSSKK..",
  "..KSSKSSKSK.",
  ".KKSSKSSKSK.",
  ".KSKKKKKKSK.",
  ".KSSSSSSSSK.",
  ".KSSSSSSSsK.",
  "..KSSSSSssK.",
  "..KsssssssK.",
  "...KKKKKKK..",
  "............",
];

const HAND = [
  "............",
  "...K.K.K....",
  "..KSKSKSK...",
  "..KSKSKSKK..",
  "..KSKSKSKSK.",
  "..KSSSSSKSK.",
  ".KKSSSSSSSK.",
  "KSKSSSSSSSK.",
  "KSSSSSSSSK..",
  ".KSSSSSSsK..",
  "..KSSSSsK...",
  "...KKKKK....",
];

const HAIR = [
  "............",
  "...KKKKKK...",
  "..KHHHHHHK..",
  ".KHHhHHhHHK.",
  ".KHhKKKKhHK.",
  ".KHK....KHK.",
  ".KHK....KHK.",
  ".KhK....KhK.",
  ".KHK....KHK.",
  "..KhK..KhK..",
  "..KK....KK..",
  "............",
];

const STAR = [
  "............",
  ".....KK.....",
  ".....KYK....",
  ".K..KYYK..K.",
  ".KKKYYYYKKK.",
  "..KYYWWYYK..",
  "...KYWWYK...",
  "..KYYYYYYK..",
  ".KKKYKKYKKK.",
  ".K..KK.KK.K.",
  "............",
  "............",
];

const SWOOSH = [
  "............",
  "........KK..",
  "......KKWWK.",
  "....KKWWKK..",
  "...KWWKK....",
  "..KWKK..KK..",
  ".KWK..KKWWK.",
  ".KK.KKWWKK..",
  "...KWWKK....",
  "..KWKK......",
  "..KK........",
  "............",
];

const BUBBLE = [
  "............",
  ".KKKKKKKKKK.",
  "KWWWWWWWWWWK",
  "KWWWWWWWWWWK",
  "KWWKWWKWWKWK",
  "KWWWWWWWWWWK",
  ".KKKWWKKKKK.",
  "...KWK......",
  "...KK.......",
  "............",
  "............",
  "............",
];

const EYE = [
  "............",
  "............",
  "...KKKKKK...",
  "..KWWWWWWK..",
  ".KWWKKKKWWK.",
  "KWWKBBbbKWWK",
  "KWWKBKKbKWWK",
  ".KWWKKKKWWK.",
  "..KWWWWWWK..",
  "...KKKKKK...",
  "............",
  "............",
];

const SHIELD = [
  "............",
  ".KKKKKKKKKK.",
  ".KIIIIIIiiK.",
  ".KIIIYYIiiK.",
  ".KIIIYYIiiK.",
  ".KIYYYYYYiK.",
  ".KIIIYYIiiK.",
  "..KIIYYIiK..",
  "..KIIIIiiK..",
  "...KIIiiK...",
  "....KKKK....",
  "............",
];

const HEART = [
  "............",
  "..KKK..KKK..",
  ".KPPPKKPPPK.",
  "KPWPPPPPPPpK",
  "KPPPPPPPPPpK",
  "KPPPPPPPPPpK",
  ".KPPPPPPPpK.",
  "..KPPPPPpK..",
  "...KPPPpK...",
  "....KPpK....",
  ".....KK.....",
  "............",
];

const DROP = [
  "............",
  ".....KK.....",
  "....KBBK....",
  "....KBBK....",
  "...KBBBBK...",
  "..KBWBBBbK..",
  "..KBWBBBbK..",
  ".KBBBBBBbbK.",
  ".KBBBBBBbbK.",
  "..KBBBBbbK..",
  "...KKKKKK...",
  "............",
];

const BOLT = [
  "............",
  "......KKKK..",
  ".....KYYK...",
  "....KYYK....",
  "...KYYKKKK..",
  "..KYYYYYYK..",
  "..KKKKYYK...",
  "....KYYK....",
  "...KYYK.....",
  "..KYKK......",
  "..KK........",
  "............",
];

const WIND = [
  "............",
  "............",
  ".KKKKKKKK...",
  "KBBBBBBBBK..",
  ".KKKKKKKBK..",
  ".......KK...",
  "..KKKKKKKKK.",
  ".KBBBBBBBBBK",
  "..KKKKKKKKK.",
  "............",
  "............",
  "............",
];

const SWORD = [
  "............",
  ".........KK.",
  "........KWK.",
  ".......KWK..",
  "......KWK...",
  "..K..KWK....",
  "..KKKWK.....",
  "...KYK......",
  "..KYKKK.....",
  ".KYK..K.....",
  ".KK.........",
  "............",
];

const DOOR = [
  "............",
  "..KKKKKKKK..",
  "..KffffffK..",
  "..KfFFFFfK..",
  "..KfFFFFfK..",
  "..KfFFFFfK..",
  "..KfFFFYfK..",
  "..KfFFFFfK..",
  "..KfFFFFfK..",
  "..KfFFFFfK..",
  "..KKKKKKKK..",
  "............",
];

const SHIRT = [
  "............",
  "..KKK..KKK..",
  ".KCCCKKCCCK.",
  "KCCCCCCCCCCK",
  "KCCKCCCCKCCK",
  ".KKKCCCCKKK.",
  "...KCCCCK...",
  "...KCCCCK...",
  "...KCCCCK...",
  "...KccccK...",
  "...KKKKKK...",
  "............",
];

// Small badges, laid over a corner of a bigger icon.
const UP = ["..K..", ".KYK.", "KYYYK", ".KYK.", ".KKK."];
const DOWN = [".KKK.", ".KBK.", "KBBBK", ".KBK.", "..K.."];
const PLUS = [".KKK.", "KKGKK", "KGGGK", "KKGKK", ".KKK."];
const MINUS = [".....", "KKKKK", "KRRRK", "KKKKK", "....."];
const BAR = [".....", "KKKKK", "KYYYK", "KKKKK", "....."];

const svg = (rows: readonly string[]) => pixelSvg(rows, PALETTE);
const badge = (rows: readonly string[], over: readonly string[]) => svg(layered(12, [rows, 0, 0], [over, 7, 7]));

const GREEN_HEART = recolor(HEART, "PG", "pg");
const fist = svg(FIST);
const shield = svg(SHIELD);
const heart = svg(HEART);

/** The groups the brawl's menu sorts her moves into (fightpanels.ts). */
export type MoveGroup = "attack" | "words" | "recover" | "mind" | "stance" | "intimate";

export const GROUP_ICONS: Readonly<Record<MoveGroup, string>> = {
  attack: fist,
  words: svg(BUBBLE),
  recover: svg(GREEN_HEART),
  mind: svg(DROP),
  stance: svg(BOLT),
  intimate: heart,
};

/** Each of her moves' icon. */
export const MOVE_ICONS: Readonly<Record<FightMove, string>> = {
  strike: fist,
  kick: badge(STAR, PLUS),
  shove: svg(HAND),
  grab: svg(HAND),
  headlock: badge(HAND, PLUS),
  hairpull: svg(HAIR),
  tackle: svg(STAR),
  dodge: svg(SWOOSH),
  talk: svg(BUBBLE),
  stare: svg(EYE),
  steel: shield,
  restore: svg(DROP),
  revitalize: svg(GREEN_HEART),
  breathe: svg(WIND),
  fixClothes: svg(SHIRT),
  cautious: svg(EYE),
  defensive: shield,
  counter: svg(SWORD),
  open: heart,
  flaunt: heart,
  lead: heart,
  giveUp: svg(SWOOSH),
  pullToys: svg(HAND),
  deny: svg(DROP),
  suppress: badge(HEART, DOWN),
  suppressCock: badge(HEART, DOWN),
  release: badge(HEART, UP),
  releaseCock: badge(HEART, UP),
  eye: svg(recolor(EYE, "BY", "bF")),
  edge: badge(HEART, BAR),
  resist: badge(HEART, MINUS),
  // KP's See, Hear and Speak No Evil: an eye, a speech bubble, a heart, each struck down.
  seeNoEvil: badge(EYE, MINUS),
  hearNoEvil: badge(BUBBLE, MINUS),
  speakNoEvil: badge(HEART, DOWN),
  hands: heart,
  mouth: heart,
  ride: heart,
  throw: svg(DOOR),
  struggle: badge(FIST, UP),
  goAlong: heart,
  recover: svg(STAR),
  secondWind: badge(BOLT, UP),
  stayDown: badge(SHIELD, DOWN),
};

/** The little icons on a fight card's tag chips (battleview.ts): how someone stands, at a glance. */
export type TagIcon = "angry" | "drunk" | "horny" | "erect" | "spent" | "prefix" | "will" | "stance" | "clothes" | "calm" | "hot" | "weak" | "dazed";

export const TAG_ICONS: Readonly<Record<TagIcon, string>> = {
  angry: fist,
  drunk: svg(recolor(DROP, "BF", "bf")),
  horny: heart,
  erect: svg(recolor(BOLT, "YP")),
  spent: svg(recolor(DROP, "BC", "bc")),
  prefix: svg(STAR),
  will: svg(DROP),
  stance: svg(BOLT),
  clothes: svg(SHIRT),
  calm: svg(GREEN_HEART),
  hot: svg(recolor(HEART, "PR", "pR")),
  // Their weak spot (brawlaim.ts), and what her aimed strikes left them with.
  weak: svg(EYE),
  dazed: svg(STAR),
};
