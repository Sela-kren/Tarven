/**
 * A small pixel picture for each group of passives, in the same 12x12 style as the HUD's icons, so the journal's
 * passive pages read as pictures first.
 */
import { CUP, DISH, FLAME, VILLAGERS } from "./hud";
import { pixelSvg } from "./icons";
import type { PassiveGroup } from "./passives";

const K = "#1c140e";

const HAND = [
  "............",
  "...K.K.K....",
  "..KSKSKSK...",
  "..KSKSKSK.K.",
  "..KSKSKSKKSK",
  "..KSSSSSSKSK",
  ".KKSSSSSSSK.",
  "KSKSSSSSSSK.",
  "KSSSSSSSSK..",
  ".KSSSSSSSK..",
  "..KSSSSSK...",
  "...KKKKK....",
];

const LIPS = [
  "............",
  "............",
  "..KKK..KKK..",
  ".KRRRKKRRRK.",
  "KRRWRRRRRRRK",
  "KDDDDDDDDDDK",
  "KRRRRRRRRRRK",
  ".KRRRRRRRRK.",
  "..KRRRRRRK..",
  "...KKKKKK...",
  "............",
  "............",
];

const BOW = [
  "............",
  ".KK......KK.",
  "KPPK....KPPK",
  "KPPPKKKKPPPK",
  "KPPPKRRKPPPK",
  "KPPPKRRKPPPK",
  "KPPPKKKKPPPK",
  "KPPK.KK.KPPK",
  ".KK.KPPK.KK.",
  "...KPK.KPK..",
  "...KK...KK..",
  "............",
];

const HEART = [
  "............",
  "..KKK..KKK..",
  ".KPPPKKPPPK.",
  "KPWPPPPPPPPK",
  "KPPPPPPPPPPK",
  "KPPPPPPPPPPK",
  ".KPPPPPPPPK.",
  "..KPPPPPPK..",
  "...KPPPPK...",
  "....KPPK....",
  ".....KK.....",
  "............",
];

const FIGURE = [
  "....K..K....",
  "....KCCK....",
  "...KCCCCK...",
  "...KCCCCK...",
  "....KCCK....",
  "....KCCK....",
  "...KCCCCK...",
  "..KCCCCCCK..",
  ".KCCCCCCCCK.",
  "KCCCCCCCCCCK",
  "KKKKKKKKKKKK",
  "............",
];

const PEACH = [
  "......KK....",
  ".....KGGK...",
  "..KKKKGKKK..",
  ".KPPPPKPPPK.",
  "KPPWPPKPPPPK",
  "KPWPPPKPPPPK",
  "KPPPPPKPPPPK",
  "KPPPPPKPPPPK",
  ".KPPPPKPPPK.",
  "..KPPPKPPK..",
  "...KKKKKK...",
  "............",
];

const STOCKING = [
  "..KKKKKK....",
  "..KWWWWK....",
  "..KLLLLK....",
  "..KLLLLK....",
  "..KLLLLK....",
  "...KLLLK....",
  "...KLLLK....",
  "...KLLLK....",
  "...KLLLKK...",
  "...KLLLLLKK.",
  "...KLLLLLLLK",
  "...KKKKKKKK.",
];

const ROSE = [
  "............",
  "...KKKKKK...",
  "..KRRDDRRK..",
  ".KRDRRRRDRK.",
  ".KRRDDDDRRK.",
  ".KRDRRRRDRK.",
  "..KRRRRRRK..",
  "...KKGGKK...",
  ".KK..GG.....",
  "KGGK.GG.....",
  ".KK..GG.....",
  ".....GG.....",
];

const AUBERGINE = [
  "........KK..",
  ".......KGGK.",
  "......KGGK..",
  ".....KPPK...",
  "....KPPPK...",
  "...KPPPPK...",
  "..KPWPPK....",
  ".KPWPPPK....",
  ".KPPPPK.....",
  ".KPPPK......",
  "..KKK.......",
  "............",
];

const EYE = [
  "............",
  "............",
  "...KKKKKK...",
  "..KWWWWWWK..",
  ".KWWKKKKWWK.",
  "KWWKBBBBKWWK",
  "KWWKBKKBKWWK",
  ".KWWKKKKWWK.",
  "..KWWWWWWK..",
  "...KKKKKK...",
  "............",
  "............",
];

const KEY = [
  "............",
  "............",
  "..KKK.......",
  ".KGGGK......",
  "KGK.KGKKKKKK",
  "KGK.KGGGGGGK",
  "KGK.KGKKGKGK",
  ".KGGGK.KK.K.",
  "..KKK.......",
  "............",
  "............",
  "............",
];

const PILLOW = [
  "............",
  "............",
  ".KKKKKKKKKK.",
  "KWWWWWWWWWWK",
  "KWWPPWPPWWWK",
  "KWPPPPPPPWWK",
  "KWWPPPPPWWWK",
  "KWWWPPPWWWWK",
  "KWWWWPWWWWWK",
  ".KKKKKKKKKK.",
  "............",
  "............",
];

const ROPE = [
  "............",
  "...KKKKKK...",
  "..KRRRRRRK..",
  ".KRKKKKKKRK.",
  ".KRK....KRK.",
  ".KRK.KK.KRK.",
  ".KRK.KRKKRK.",
  ".KRKKKRRRK..",
  "..KRRRRKK...",
  "...KKKKRK...",
  ".......KRK..",
  "........KK..",
];

const TWO_HEARTS = [
  "............",
  ".KK.KK......",
  "KPPKPPK.....",
  "KPPPPPK.....",
  ".KPPPK......",
  "..KPK.KK.KK.",
  "...K.KRRKRRK",
  ".....KRRRRRK",
  "......KRRRK.",
  ".......KRK..",
  "........K...",
  "............",
];

const SHIELD = [
  ".KKKKKKKKKK.",
  ".KBBBBBBBBK.",
  ".KBWWBBBBBK.",
  ".KBWBBBBBBK.",
  ".KBBBBBBBBK.",
  ".KBBBBBBBBK.",
  "..KBBBBBBK..",
  "..KBBBBBBK..",
  "...KBBBBK...",
  "....KBBK....",
  ".....KK.....",
  "............",
];

const DAGGER = [
  "..........K.",
  ".........KWK",
  "........KWK.",
  ".......KWK..",
  "......KWK...",
  ".....KWK....",
  "..K.KWK.....",
  "..KKGK......",
  "...KGK......",
  "..KBKKK.....",
  ".KBK........",
  ".KK.........",
];

const STAR = [
  "............",
  ".....KK.....",
  "....KYYK....",
  "KKKKKYYKKKKK",
  "KYYYYYYYYYYK",
  ".KYYYYYYYYK.",
  "..KYYYYYYK..",
  "..KYYKKYYK..",
  ".KYYK..KYYK.",
  ".KKK....KKK.",
  "............",
  "............",
];

const FIST = [
  "............",
  "...KKKKKK...",
  "..KSKSKSKK..",
  "..KSKSKSKSK.",
  "..KSKSKSKSK.",
  "..KSSSSSSSK.",
  ".KSKKSSSSSK.",
  ".KSSSKSSSSK.",
  "..KSSSSSSK..",
  "...KSSSSK...",
  "...KBBBBK...",
  "...KKKKKK...",
];

const MIRROR = [
  "....KKKK....",
  "...KGGGGK...",
  "..KGWWLLGK..",
  "..KGWLLLGK..",
  "..KGLLLLGK..",
  "..KGLLLLGK..",
  "...KGGGGK...",
  "....KKKK....",
  ".....KK.....",
  ".....GK.....",
  ".....GK.....",
  ".....KK.....",
];

const BOOK = [
  "............",
  "............",
  ".KKKK..KKKK.",
  "KPPPPKKPPPPK",
  "KPLLPKKPLLPK",
  "KPPPPKKPPPPK",
  "KPLLPKKPLLPK",
  "KPPPPKKPPPPK",
  "KKKKKKKKKKKK",
  ".KBBBBBBBBK.",
  "............",
  "............",
];

const DICE = [
  "............",
  ".KKKKKKKKKK.",
  "KWWWWWWWWWWK",
  "KWRRWWWWWWWK",
  "KWRRWWWWWWWK",
  "KWWWWRRWWWWK",
  "KWWWWRRWWWWK",
  "KWWWWWWWRRWK",
  "KWWWWWWWRRWK",
  "KWWWWWWWWWWK",
  ".KKKKKKKKKK.",
  "............",
];

export const PASSIVE_ICONS: Record<PassiveGroup, string> = {
  brawler: pixelSvg(FIST, { K, S: "#f0c8a0", B: "#8a5a30" }),
  charm: pixelSvg(MIRROR, { K, G: "#d9a93a", W: "#ffffff", L: "#a8d0f0" }),
  afterHours: pixelSvg(DICE, { K, W: "#f0e8f0", R: "#c8202c" }),
  mind: pixelSvg(BOOK, { K, P: "#f0e2b8", L: "#8a7a5a", B: "#5a3a20" }),
  hands: pixelSvg(HAND, { K, S: "#f0c8a0" }),
  mouth: pixelSvg(LIPS, { K, R: "#d0303c", D: "#7a1020", W: "#ff9aa0" }),
  neck: pixelSvg(BOW, { K, P: "#e070a0", R: "#a03060" }),
  breasts: pixelSvg(HEART, { K, P: "#e8607c", W: "#ffd0dc" }),
  hips: pixelSvg(FIGURE, { K, C: "#c04a6a" }),
  butt: pixelSvg(PEACH, { K, P: "#f09070", G: "#4a9a46", W: "#ffd0b0" }),
  thighs: pixelSvg(STOCKING, { K, L: "#3a2a4a", W: "#e8e0f0" }),
  pussy: pixelSvg(ROSE, { K, R: "#e0507a", D: "#8a1838", G: "#4a9a46" }),
  cock: pixelSvg(AUBERGINE, { K, P: "#6a3a8a", W: "#a070c0", G: "#4a9a46" }),
  exhibition: pixelSvg(EYE, { K, W: "#f0f0e8", B: "#4a8ac8" }),
  invitations: pixelSvg(KEY, { K, G: "#d9a93a" }),
  masturbation: pixelSvg(PILLOW, { K, W: "#f0e8f0", P: "#e8607c" }),
  sadism: pixelSvg(HAND, { K, S: "#d04030" }),
  masochism: pixelSvg(ROPE, { K, R: "#b08040" }),
  desire: FLAME,
  leaning: pixelSvg(TWO_HEARTS, { K, P: "#e8607c", R: "#c8202c" }),
  drink: CUP,
  bar: DISH,
  composure: pixelSvg(SHIELD, { K, B: "#4a7ab0", W: "#a0c8f0" }),
  corruption: pixelSvg(DAGGER, { K, W: "#d0d8e0", G: "#d9a93a", B: "#5a3a20" }),
  village: VILLAGERS,
  fame: pixelSvg(STAR, { K, Y: "#f0c040" }),
};
