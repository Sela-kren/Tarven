import { DataTexture, NearestFilter, RGBAFormat, UnsignedByteType } from "three";

/**
 * Her underwear styles: bras, briefs and one-pieces drawn as cut-outs on a patch of her trunk's skin, built a little
 * way out from it in its own material (add_lingerie in build_world.py). The patch's UVs are two flat frames: her front
 * as seen from the front in the left half of the texture, her back as seen from behind in the right half.
 *
 * Each style is a pair of shapes, front and back, measured in metres on her as built: `x` across her from her
 * middle (always the near side's distance, as every style is the same on both sides), `z` up from the floor. A
 * shape says how far inside it a point is (negative outside). The first style in each list is the one painted on
 * her body itself (her breast band, her braies), which draws nothing here.
 */
export const LINGERIE_MATERIAL = "T_lingerie";

/** The patch's UV frames, as build_world.py lays them: model metres, x across and z up (glTF stores v flipped). */
export const LINGERIE_FRAME = { half: 0.208, bottom: 0.6, top: 1.4 } as const;
/** Columns in each half (front, back) and rows: square texels 4 mm across, coarse like the rest of her. */
export const LINGERIE_COLUMNS = 104;
export const LINGERIE_WIDTH = LINGERIE_COLUMNS * 2;
export const LINGERIE_HEIGHT = 200;

/** Where her right nipple is on her as built, from the front. */
export const NIPPLE = { x: 0.078, z: 1.149 } as const;

type Shape = (x: number, z: number) => number;
export type Side = "front" | "back";

export interface UnderStyle {
  id: string;
  label: string;
  /** "top" is a bra, "bottom" a pair of briefs, "whole" a one-piece worn instead of both. */
  kind: "top" | "bottom" | "whole";
  /** What guests call it when they want it off. */
  garment: string;
  /** Null for the style painted on her body, which draws nothing. */
  front: Shape | null;
  back: Shape | null;
  /** How firmly it holds her bust, out of 1, for a top or a one-piece. */
  hold?: number;
  /** Finer work drawn over the cloth: a darker shade where it returns less than 1. */
  detail?: (side: Side, x: number, z: number, inside: number) => number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- Shapes ----------------------------------------------------------------------------------------

/**
 * A polygon, its corners in order: how far inside it a point is. Corners on her middle (x = 0) reach on past it,
 * so a shape drawn on her one side has no edge down her middle when it's mirrored.
 */
function polygon(corners: readonly (readonly [number, number])[]): Shape {
  const points = corners.map(([x, z]) => [x === 0 ? -0.05 : x, z] as const);
  return (x, z) => {
    let best = Infinity;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, az] = points[j];
      const [bx, bz] = points[i];
      const ex = bx - ax, ez = bz - az;
      const t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
      if (az > z !== bz > z && x < ax + ((z - az) * ex) / ez) inside = !inside;
    }
    return inside ? best : -best;
  };
}

/** A strap or string: a line from one point to the next, `w` either side of it, through every point given. */
function line(w: number, ...points: (readonly [number, number])[]): Shape {
  return (x, z) => {
    let best = Infinity;
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1];
      const [bx, bz] = points[i];
      const ex = bx - ax, ez = bz - az;
      const t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
    }
    return w - best;
  };
}

const circle = (cx: number, cz: number, r: number): Shape => (x, z) => r - Math.hypot(x - cx, z - cz);
const union = (...shapes: Shape[]): Shape => (x, z) => Math.max(...shapes.map((shape) => shape(x, z)));
const both = (...shapes: Shape[]): Shape => (x, z) => Math.min(...shapes.map((shape) => shape(x, z)));
const minus = (shape: Shape, cut: Shape): Shape => (x, z) => Math.min(shape(x, z), -cut(x, z));
/** Everything between two heights, all the way round. */
const band = (low: number, high: number): Shape => (_x, z) => Math.min(z - low, high - z);
/** Everything below a line across her, given as its height at her middle and at her side (x = 0.2). */
const below = (middle: number, side: number): Shape => (x, z) => middle + (side - middle) * Math.min(1, x / 0.2) - z;
const nothing: Shape = () => -1;

// ---- Landmarks -------------------------------------------------------------------------------------

/** Where her thighs meet, the bottom of every pair of briefs. */
const CROTCH = 0.746;
/** The crease under her bust, and her bra's band at the back. */
const UNDERBUST = 1.092;
const BACK_BAND = [1.098, 1.124] as const;
/** Over her shoulders, where a strap goes from the front to the back. */
const SHOULDER = 1.345;

// ---- Bras ------------------------------------------------------------------------------------------

/** The strip under the cups and round to the back, and the gore between them. */
const underband = (depth = 0.018): Shape =>
  union(band(UNDERBUST - depth * 0.6, UNDERBUST + depth * 0.4), polygon([[0, UNDERBUST - depth * 0.6], [0.016, UNDERBUST - depth * 0.6], [0.012, 1.13], [0, 1.13]]));
const backBand = (low: number = BACK_BAND[0], high: number = BACK_BAND[1]): Shape => band(low, high);
/** A strap over the shoulder, from the cup's top on the front, or down to the band on the back. */
const frontStrap = (from: readonly [number, number], w = 0.005): Shape => line(w, from, [0.076, SHOULDER]);
const backStrap = (w = 0.005, x = 0.074): Shape => line(w, [0.076, SHOULDER], [x, BACK_BAND[1] - 0.004]);

/** A whole cup, round over the breast, from her underbust to `top` above the nipple. */
const fullCup = (top = 0.065, wide = 0.056): Shape =>
  both(union(circle(NIPPLE.x - 0.006, NIPPLE.z - 0.008, wide), polygon([[0.018, UNDERBUST], [0.13, UNDERBUST], [0.12, 1.16], [0.03, 1.16]])), (_x, z) => NIPPLE.z + top - z);
/** A cup cut straight across, `rise` above the nipple. */
const cutCup = (rise: number, wide = 0.056): Shape => both(fullCup(0.1, wide), (_x, z) => NIPPLE.z + rise - z);
/** A cup cut on a slant, low at the middle and high at the side. */
const slantCup = (inner: number, outer: number, wide = 0.056): Shape =>
  both(fullCup(0.1, wide), (x, z) => NIPPLE.z + inner + (outer - inner) * clamp((x - 0.02) / 0.1, 0, 1) - z);
const triangleCup = (peak = 1.222, inner = 0.016): Shape =>
  polygon([[inner, UNDERBUST - 0.004], [0.128, UNDERBUST - 0.004], [0.084, peak], [0.072, peak]]);

/** A bra: cups, band and straps, and the same band and straps on her back. */
function bra(cup: Shape, o: { straps?: number; strapFrom?: readonly [number, number]; band?: number; backBand?: [number, number]; gore?: boolean } = {}): Pick<UnderStyle, "front" | "back"> {
  const strap = o.straps ?? 0.005;
  const from = o.strapFrom ?? [0.09, 1.19];
  const parts = [cup, underband(o.band ?? 0.018)];
  if (strap > 0) parts.push(frontStrap(from, strap));
  const back = [backBand(...(o.backBand ?? BACK_BAND))];
  if (strap > 0) back.push(backStrap(strap));
  return { front: union(...parts), back: union(...back) };
}

/** Rings stitched round the cup, as a bullet bra's. */
const stitched = (_side: Side, x: number, z: number, inside: number) => {
  const r = Math.hypot(x - NIPPLE.x, z - NIPPLE.z);
  return inside > 0.006 && r < 0.05 && Math.floor(r / 0.008) % 2 === 1 ? 0.78 : 1;
};
/** Lace towards the edges: a dark and light checker in the cloth, open towards the very edge. */
const lace = (_side: Side, x: number, z: number, inside: number) => {
  if (inside > 0.014) return 1;
  return (Math.floor((x + 1) / 0.004) + Math.floor(z / 0.004)) % 2 ? 0.7 : 1;
};
/** Boning down a corset or bustier, and lacing up its back. */
const boned = (side: Side, x: number, _z: number, inside: number) => {
  if (inside < 0.003) return 1;
  if (side === "back" && x < 0.008) return x < 0.003 ? 0.55 : 0.8;
  return Math.abs(((x + 0.015) % 0.035) - 0.0175) < 0.002 ? 0.8 : 1;
};

export const BRA_STYLES: UnderStyle[] = [
  { id: "band", label: "Breast band", kind: "top", garment: "breast band", front: null, back: null, hold: 1 },
  {
    id: "pasties", label: "Pasties", kind: "top", garment: "pasties", hold: 0,
    front: union(line(0.0045, [NIPPLE.x - 0.018, NIPPLE.z - 0.018], [NIPPLE.x + 0.018, NIPPLE.z + 0.018]),
      line(0.0045, [NIPPLE.x - 0.018, NIPPLE.z + 0.018], [NIPPLE.x + 0.018, NIPPLE.z - 0.018])),
    back: nothing,
  },
  {
    id: "covers", label: "Nipple covers", kind: "top", garment: "nipple covers", hold: 0,
    front: (x, z) => {
      const a = Math.atan2(z - NIPPLE.z, x - NIPPLE.x);
      return 0.016 + 0.004 * Math.cos(5 * a) - Math.hypot(x - NIPPLE.x, z - NIPPLE.z);
    },
    back: nothing,
  },
  {
    id: "shelf", label: "Shelf", kind: "top", garment: "bra", hold: 0.8,
    ...bra(both(fullCup(), (_x, z) => NIPPLE.z - 0.022 - z), { strapFrom: [0.118, 1.12] }),
  },
  {
    id: "harness", label: "Harness", kind: "top", garment: "harness", hold: 0.3,
    front: union(
      underband(0.012),
      // A ring round each breast and a halter from between them up round her neck.
      (x, z) => 0.0045 - Math.abs(Math.hypot(x - NIPPLE.x + 0.004, z - NIPPLE.z) - 0.05),
      line(0.0045, [0, 1.11], [0, 1.2], [0.03, 1.27], [0.05, SHOULDER]),
      line(0.0045, [0, 1.2], [0.02, 1.23], [0.0, 1.26]),
    ),
    back: union(backBand(1.105, 1.12), line(0.0045, [0.05, SHOULDER], [0.02, 1.26], [0.0, 1.21], [0.0, 1.12])),
  },
  {
    id: "adhesive", label: "Adhesive", kind: "top", garment: "stick-on bra", hold: 0.8,
    front: union(slantCup(0.02, 0.012, 0.05), polygon([[0, 1.115], [0.03, 1.115], [0.03, 1.135], [0, 1.135]])),
    back: nothing,
  },
  { id: "strapless", label: "Strapless", kind: "top", garment: "bra", hold: 0.7, ...bra(cutCup(0.03), { straps: 0, backBand: [1.1, 1.13] }) },
  { id: "threequarter", label: "Three-quarter cup", kind: "top", garment: "bra", hold: 0.9, ...bra(slantCup(0.022, 0.048)) },
  { id: "bullet", label: "Bullet", kind: "top", garment: "bra", hold: 1, ...bra(fullCup(0.055)), detail: stitched },
  { id: "triangle", label: "Triangle", kind: "top", garment: "bra", hold: 0.4, ...bra(triangleCup(), { strapFrom: [0.078, 1.218], band: 0.014 }) },
  {
    id: "plunge", label: "Plunge", kind: "top", garment: "bra", hold: 0.9,
    ...bra(both(fullCup(0.06), (x, z) => 1.105 + (x - 0.012) * 2.6 - z), { strapFrom: [0.095, 1.195] }),
  },
  { id: "balconette", label: "Balconette", kind: "top", garment: "bra", hold: 1, ...bra(cutCup(0.024), { strapFrom: [0.108, 1.17] }) },
  { id: "fullcup", label: "Full cup", kind: "top", garment: "bra", hold: 1, ...bra(fullCup(0.07, 0.06)) },
  { id: "demi", label: "Demi", kind: "top", garment: "bra", hold: 0.9, ...bra(slantCup(0.012, 0.03), { strapFrom: [0.11, 1.18] }) },
  { id: "minimizer", label: "Minimizer", kind: "top", garment: "bra", hold: 0.8, ...bra(fullCup(0.075, 0.064), { straps: 0.007, band: 0.024 }) },
  {
    id: "bandeau", label: "Bandeau", kind: "top", garment: "bandeau", hold: 0.5,
    front: band(1.1, NIPPLE.z + 0.034), back: band(1.1, 1.14),
  },
  {
    id: "sport", label: "Sport", kind: "top", garment: "sports bra", hold: 0.7,
    front: union(both(band(1.07, 1.25), (x, z) => 1.19 + x * 0.9 - z), line(0.014, [0.06, 1.2], [0.07, SHOULDER])),
    back: union(band(1.07, 1.12), polygon([[0, 1.07], [0.05, 1.12], [0.075, SHOULDER], [0.055, SHOULDER], [0, 1.2]])),
    detail: (side, _x, z, inside) => (side === "front" && z < 1.09 && inside > 0.003 ? 0.82 : 1),
  },
  {
    id: "cami", label: "Cami", kind: "top", garment: "cami", hold: 0.3,
    front: union(band(1.0, 1.215), line(0.0035, [0.07, 1.21], [0.075, SHOULDER])),
    back: union(band(1.0, 1.2), line(0.0035, [0.075, SHOULDER], [0.075, 1.2])),
  },
  {
    id: "bralette", label: "Bralette", kind: "top", garment: "bralette", hold: 0.4,
    ...bra(union(triangleCup(1.21, 0.012), band(1.07, UNDERBUST + 0.01)), { strapFrom: [0.078, 1.205], backBand: [1.07, 1.12] }),
    detail: lace,
  },
  {
    id: "longline", label: "Longline", kind: "top", garment: "bra", hold: 1,
    ...bra(union(fullCup(0.062), band(1.0, UNDERBUST + 0.005)), { backBand: [1.0, 1.124] }),
  },
  {
    id: "corset", label: "Corset", kind: "top", garment: "corset", hold: 1,
    front: union(both(band(0.94, 1.2), (x, z) => 1.17 + x * 0.25 - z), cutCup(0.026)),
    back: band(0.94, 1.15),
    detail: boned,
  },
  {
    id: "bustier", label: "Bustier", kind: "top", garment: "bustier", hold: 0.9,
    front: union(band(1.02, UNDERBUST + 0.01), cutCup(0.03)),
    back: band(1.02, 1.13),
    detail: boned,
  },
];

// ---- Briefs ----------------------------------------------------------------------------------------

/** Between her legs, front and back. */
const gusset = (w = 0.02): Shape => polygon([[0, CROTCH - 0.004], [w, CROTCH - 0.004], [w, 0.775], [0, 0.775]]);
/** A leg opening rising from her crotch to her hip: its height at her side (x = 0.2), straight or `curve`d. */
const legLine = (side: number, curve = 1, from = 0.02): Shape => (x, z) =>
  z - (CROTCH + (side - CROTCH) * Math.max(0, (x - from) / (0.2 - from)) ** curve);
/** A full seat at the back, down over the cheeks to just above the crease under them. */
const fullSeat = (side: number, low = CROTCH): Shape => (x, z) => z - (low + (side - low) * clamp((x - 0.11) / 0.09, 0, 1) ** 1.5);
/** The front of a string: a small triangle from her crotch up to its strings at `top`. */
const triangleFront = (top: number, w: number): Shape => polygon([[0, CROTCH - 0.004], [0.02, CROTCH - 0.004], [w, top], [0, top]]);
/** A string round her hips at a height, from the front piece's corner round to the back. */
const hipString = (z: number, w = 0.003, from = 0.04): Shape => line(w, [from, z], [0.3, z]);

/** A pair of briefs: up to the waist (middle and side heights), down to the leg line, and a seat at the back. */
function briefs(o: { waist: number; waistSide?: number; legSide: number; legCurve?: number; seat: Shape; backWaist?: number }): Pick<UnderStyle, "front" | "back"> {
  const side = o.waistSide ?? o.waist;
  return {
    front: union(both(below(o.waist, side), legLine(o.legSide, o.legCurve)), gusset()),
    back: union(both(below(o.backWaist ?? o.waist + 0.01, side), o.seat), gusset(0.016)),
  };
}

/** A thong's back: a triangle from its waistband narrowing to a strip between the cheeks. */
const thongBack = (waist: number, w: number) =>
  union(polygon([[0, waist], [w, waist], [0.008, waist - 0.07], [0.006, CROTCH]]), gusset(0.012), line(0.004, [0, CROTCH], [0, waist]));

export const BRIEF_STYLES: UnderStyle[] = [
  { id: "braies", label: "Braies", kind: "bottom", garment: "smallclothes", front: null, back: null },
  {
    id: "cstring", label: "C-string", kind: "bottom", garment: "c-string",
    front: union(triangleFront(0.84, 0.05), gusset(0.016)),
    back: union(gusset(0.01), line(0.004, [0, CROTCH], [0, 0.82])),
  },
  {
    id: "tstring", label: "T-string", kind: "bottom", garment: "t-string",
    front: union(triangleFront(0.85, 0.05), hipString(0.85, 0.0035, 0.045)),
    back: union(hipString(0.85, 0.0035, 0), line(0.003, [0, CROTCH], [0, 0.85]), gusset(0.01)),
  },
  {
    id: "vstring", label: "V-string", kind: "bottom", garment: "v-string",
    front: union(triangleFront(0.85, 0.05), hipString(0.85, 0.0035, 0.045)),
    back: union(line(0.0035, [0.3, 0.88], [0.18, 0.88], [0, 0.82]), line(0.003, [0, CROTCH], [0, 0.82]), gusset(0.01)),
  },
  {
    id: "gstring", label: "G-string", kind: "bottom", garment: "g-string",
    front: union(triangleFront(0.84, 0.042), hipString(0.86, 0.0025, 0.03), line(0.0025, [0.042, 0.84], [0.06, 0.86])),
    back: union(hipString(0.86, 0.0025, 0), line(0.0025, [0, CROTCH], [0, 0.86]), polygon([[0, 0.86], [0.02, 0.86], [0, 0.835]])),
  },
  {
    id: "thong", label: "Thong", kind: "bottom", garment: "thong",
    front: union(both(below(0.88, 0.89), legLine(0.88, 0.7)), gusset()),
    back: union(thongBack(0.89, 0.07), band(0.875, 0.89)),
  },
  {
    id: "tanga", label: "Tanga", kind: "bottom", garment: "tanga",
    front: union(both(below(0.875, 0.88), legLine(0.87, 0.8)), gusset()),
    back: union(both(below(0.88, 0.88), (x, z) => z - (CROTCH + 0.12 * clamp(x / 0.09, 0, 1) ** 1.2)), band(0.865, 0.88), gusset(0.014)),
  },
  { id: "bikini", label: "Bikini", kind: "bottom", garment: "bikini briefs", ...briefs({ waist: 0.885, waistSide: 0.89, legSide: 0.86, legCurve: 0.85, seat: fullSeat(0.86) }) },
  {
    id: "stringbikini", label: "String bikini", kind: "bottom", garment: "string bikini",
    front: union(triangleFront(0.87, 0.07), hipString(0.87, 0.003, 0.065), line(0.003, [0.22, 0.87], [0.22, 0.83])),
    back: union(polygon([[0, CROTCH - 0.004], [0.016, CROTCH - 0.004], [0.08, 0.875], [0, 0.875]]), hipString(0.872, 0.003, 0.07)),
  },
  {
    id: "brazilian", label: "Brazilian", kind: "bottom", garment: "brazilian briefs",
    front: union(both(below(0.875, 0.885), legLine(0.88, 0.75)), gusset()),
    back: union(both(below(0.89, 0.885), (x, z) => z - (CROTCH + 0.13 * clamp(x / 0.13, 0, 1) ** 0.9)), gusset(0.016)),
  },
  {
    id: "cheeky", label: "Cheeky", kind: "bottom", garment: "cheeky briefs",
    ...briefs({ waist: 0.9, legSide: 0.84, seat: (x, z) => z - (CROTCH + 0.1 * clamp((x - 0.015) / 0.18, 0, 1) ** 0.8) }),
  },
  { id: "hipster", label: "Hipster", kind: "bottom", garment: "hipsters", ...briefs({ waist: 0.88, waistSide: 0.87, legSide: 0.79, legCurve: 1.4, seat: fullSeat(0.79) }) },
  {
    id: "boyshort", label: "Boyshort", kind: "bottom", garment: "boyshorts",
    front: union(band(0.715, 0.895), gusset()),
    back: band(0.715, 0.905),
  },
  { id: "hiphugger", label: "Hiphugger", kind: "bottom", garment: "hiphuggers", ...briefs({ waist: 0.92, waistSide: 0.91, legSide: 0.8, legCurve: 1.3, seat: fullSeat(0.8) }) },
  { id: "highleg", label: "High-leg brief", kind: "bottom", garment: "briefs", ...briefs({ waist: 0.97, legSide: 0.94, legCurve: 0.6, seat: fullSeat(0.93) }) },
  { id: "highwaist", label: "High-waist brief", kind: "bottom", garment: "briefs", ...briefs({ waist: 1.05, legSide: 0.82, legCurve: 1.1, seat: fullSeat(0.82) }) },
  {
    id: "shapewear", label: "Shapewear", kind: "bottom", garment: "shapewear",
    front: union(band(0.69, 1.1), gusset()),
    back: band(0.69, 1.1),
    detail: (_side, _x, z, inside) => (inside > 0.003 && Math.abs(z - 0.72) < 0.008 ? 0.82 : 1),
  },
];

// ---- One-pieces ------------------------------------------------------------------------------------

const scoop = (middle: number, side: number): Shape => (x, z) => middle + (side - middle) * clamp(x / 0.12, 0, 1) ** 2 - z;

export const WHOLE_STYLES: UnderStyle[] = [
  {
    id: "bodysuit", label: "Bodysuit", kind: "whole", garment: "bodysuit", hold: 0.7,
    front: union(
      both(scoop(1.2, 1.24), (x, z) => z - (CROTCH + (0.95 - CROTCH) * clamp((x - 0.02) / 0.18, 0, 1) ** 0.6)),
      gusset(), line(0.005, [0.07, 1.22], [0.076, SHOULDER]),
    ),
    back: union(both(below(1.05, 1.1), (x, z) => z - (CROTCH + 0.13 * clamp(x / 0.13, 0, 1) ** 0.9)), gusset(0.014),
      line(0.005, [0.076, SHOULDER], [0.07, 1.08])),
  },
  {
    id: "plungebody", label: "Plunge bodysuit", kind: "whole", garment: "bodysuit", hold: 0.6,
    front: union(
      minus(both(below(1.25, 1.25), (x, z) => z - (CROTCH + (0.95 - CROTCH) * clamp((x - 0.02) / 0.18, 0, 1) ** 0.6)),
        polygon([[0, 1.04], [0.004, 1.04], [0.06, 1.3], [0, 1.3]])),
      gusset(), line(0.006, [0.06, 1.24], [0.072, SHOULDER]),
    ),
    back: union(thongBack(0.95, 0.09), polygon([[0, 0.94], [0.1, 0.94], [0.07, SHOULDER], [0.05, SHOULDER]]), gusset(0.012)),
  },
  {
    id: "bodyharness", label: "Body harness", kind: "whole", garment: "harness", hold: 0.3,
    front: union(
      line(0.0045, [0.0, 1.27], [0.03, 1.27], [0.05, SHOULDER]),
      (x, z) => 0.0045 - Math.abs(Math.hypot(x - NIPPLE.x + 0.004, z - NIPPLE.z) - 0.05),
      line(0.0045, [0, 1.27], [0, 0.82]),
      band(1.0, 1.01), band(1.092, 1.104),
      line(0.0045, [0.24, 0.9], [0.0, 0.82]),
      line(0.0045, [0.13, 0.9], [0.14, 0.78], [0.3, 0.74]),
      triangleFront(0.82, 0.04),
    ),
    back: union(line(0.0045, [0.05, SHOULDER], [0.0, 1.22], [0.0, 0.9]), band(1.0, 1.01), band(1.092, 1.104),
      line(0.0045, [0.3, 0.9], [0, 0.88]), line(0.003, [0, CROTCH], [0, 0.88]), gusset(0.01)),
  },
  {
    id: "shapebody", label: "Shapewear body", kind: "whole", garment: "shapewear", hold: 0.8,
    front: union(both(band(0.7, 1.22), scoop(1.2, 1.22)), gusset(), line(0.008, [0.07, 1.2], [0.076, SHOULDER])),
    back: union(band(0.7, 1.15), line(0.008, [0.076, SHOULDER], [0.07, 1.14])),
  },
];

// ---- Choosing and drawing ---------------------------------------------------------------------------

/** What can go on top: the bras, then the one-pieces, which take the place of her briefs too. */
export const TOP_STYLES: UnderStyle[] = [...BRA_STYLES, ...WHOLE_STYLES];

export function topStyle(id: string | undefined): UnderStyle {
  return TOP_STYLES.find((style) => style.id === id) ?? TOP_STYLES[0];
}

export function bottomStyle(id: string | undefined): UnderStyle {
  return BRIEF_STYLES.find((style) => style.id === id) ?? BRIEF_STYLES[0];
}

/** Whether a top or one-piece covers her nipples, so her nipple discs wear its colour. */
export function coversNipples(style: UnderStyle): boolean {
  return style.front !== null && style.front(NIPPLE.x, NIPPLE.z) > 0;
}

/** Where a texel's middle lies on her: which side, and x across from her middle and z up. Row 0 is the top. */
export function texelAt(column: number, row: number): { side: Side; x: number; z: number } {
  const { half, bottom, top } = LINGERIE_FRAME;
  const side: Side = column < LINGERIE_COLUMNS ? "front" : "back";
  const u = ((column % LINGERIE_COLUMNS) + 0.5) / LINGERIE_COLUMNS;
  const v = 1 - (row + 0.5) / LINGERIE_HEIGHT;
  return { side, x: (u - 0.5) * 2 * half, z: bottom + v * (top - bottom) };
}

/** A steady random number from 0 to 1 for a pair of whole numbers. */
function hash(a: number, b: number): number {
  let n = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export type Rgb = readonly [number, number, number];

/**
 * What she has on drawn as RGBA, LINGERIE_WIDTH by LINGERIE_HEIGHT, row 0 at the top: each piece in its own colour
 * (0..1 each), alpha 0 where there's nothing. Edges are a shade darker, and the cloth has a faint weave. The top is
 * drawn over the bottom where they meet. Either can be null, for nothing drawn.
 */
export function drawLingerie(top: UnderStyle | null, bottom: UnderStyle | null, topColor: Rgb, bottomColor: Rgb): Uint8Array {
  const data = new Uint8Array(LINGERIE_WIDTH * LINGERIE_HEIGHT * 4);
  const pieces = ([[top, topColor], [bottom, bottomColor]] as const).filter(([style]) => style && style.front);
  for (let row = 0; row < LINGERIE_HEIGHT; row++) {
    for (let column = 0; column < LINGERIE_WIDTH; column++) {
      const { side, x: signed, z } = texelAt(column, row);
      const x = Math.abs(signed);
      for (const [style, color] of pieces) {
        const shape = side === "front" ? style!.front! : style!.back!;
        const inside = shape(x, z);
        if (inside <= 0) continue;
        let shade = 0.93 + 0.07 * hash(column, row);
        if (inside < 0.0035) shade *= 0.8;
        if (style!.detail) shade *= style!.detail(side, x, z, inside);
        const at = (row * LINGERIE_WIDTH + column) * 4;
        data[at] = Math.round(clamp(color[0] * shade, 0, 1) * 255);
        data[at + 1] = Math.round(clamp(color[1] * shade, 0, 1) * 255);
        data[at + 2] = Math.round(clamp(color[2] * shade, 0, 1) * 255);
        data[at + 3] = 255;
        break;
      }
    }
  }
  return data;
}

const textures = new Map<string, DataTexture>();

/** The texture for what she has on in these colours, made once and shared. */
export function lingerieTexture(top: UnderStyle | null, bottom: UnderStyle | null, topColor: Rgb, bottomColor: Rgb): DataTexture {
  const hex = (c: Rgb) => c.map((v) => Math.round(v * 255)).join(",");
  const key = `${top?.id ?? "-"}|${bottom?.id ?? "-"}|${hex(topColor)}|${hex(bottomColor)}`;
  let texture = textures.get(key);
  if (!texture) {
    texture = new DataTexture(drawLingerie(top, bottom, topColor, bottomColor), LINGERIE_WIDTH, LINGERIE_HEIGHT, RGBAFormat, UnsignedByteType);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    textures.set(key, texture);
  }
  return texture;
}
