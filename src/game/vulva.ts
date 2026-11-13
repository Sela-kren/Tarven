/**
 * Her vulva. The model has a grid lying just over the skin of her groin, from the bottom of her mound down and back
 * between her legs (add_vulva in tools/blender/build_world.py): its middle faces in their own material (the inner
 * lips and the slit, T_vulva) and the rest in her skin's (the outer lips, T_labia). This shapes it from her look and
 * how aroused she is, on the skin as it is at that moment. Sizes are in metres at her build.
 *
 * Each corner's column and row ride in its UVs: u is the column, 0 at -x to 1 at +x (through VULVA_COLUMNS), v the
 * row, 0 at the top (the front) to 1 at the bottom (between her legs). Shapes are written over (s, t): s across her
 * from -1 to 1, t along her from 0 to 1, over the patch at the size she has.
 *
 * Her opening: between two rows (VULVA_CUT) the grid is cut down its middle column, each side of the cut with its
 * own corners (u a quarter column either side of the middle), and the cut's sides open onto her canal (T_canal), a
 * pocket going into her: u its place across, 0 on the cut's left side to 1 on its right, v its row. Closed, the
 * cut's sides meet and the canal lies flat between them, out of sight; opening parts them. Past fully open she
 * stretches (VULVA_STRETCHED): wider and rounder, the cut longer and the canal deeper, the skin around it drawn out
 * across the patch, which always stays on her skin.
 */

/** Where each column lies across the patch as built: VULVA_COLUMNS in build_world.py. Finer in the middle. */
export const VULVA_COLUMNS: readonly number[] = [-1, -0.72, -0.5, -0.34, -0.2, -0.09, 0, 0.09, 0.2, 0.34, 0.5, 0.72, 1];
/** The rows, evenly spaced along her: VULVA_ROWS in build_world.py. */
export const VULVA_ROWS = 13;
const COLS = VULVA_COLUMNS.length;
/** How many points the grid has. */
export const VULVA_GRID = COLS * VULVA_ROWS;
/** The inner lips and slit, and the outer lips in her skin. */
export const VULVA_MATERIAL = "T_vulva";
export const LABIA_MATERIAL = "T_labia";
/** Her canal behind the opening. */
export const CANAL_MATERIAL = "T_canal";
/**
 * The skin under her openings (her vulva's and her anus's), hidden while they show so it never stands in front of
 * them, and otherwise painted with her smallclothes like the skin around it.
 */
export const HOLE_MATERIAL = "T_hole";
/** The rows between which the grid is cut: VULVA_CUT in build_world.py. */
export const VULVA_CUT: readonly [number, number] = [5, 10];
/** The canal's corners between the cut's two sides: VULVA_CANAL in build_world.py. */
export const VULVA_CANAL = 5;
/** How open she is at her widest: 0 is closed, 1 fully open, and past it she stretches, as wide as she goes at 2. */
export const VULVA_STRETCHED = 2;
/** How far each side of the cut moves from the middle, fully open, at its middle and her usual size. */
const OPEN_HALF = 0.007;
/**
 * How much further it moves stretched, and how much longer the cut grows: at its top only, as the skin under its
 * bottom is hidden no further than the cut as built (VULVA_HOLE in build_world.py).
 */
const STRETCH_HALF = 0.009;
const STRETCH_LONG = 0.004;
/** How deep her canal goes behind the opening, at the middle of the cut and her usual size, and how much deeper stretched. */
const CANAL_DEPTH = 0.03;
const STRETCH_DEEP = 0.015;
/** How much further over the skin the game lays it than it was built (VULVA_LIFT), clear of the pubic patch. */
const LIFT = 0.0003;
/** How far from the patch as built a point of another mesh can lie and still ride over it. */
export const VULVA_RIDE = 0.012;

export interface VulvaType {
  id: string;
  label: string;
  /** How high the outer lips stand over the skin at their fullest. */
  outer: number;
  /** How far from the middle their crest is, as a share of the half width. */
  crest: number;
  /** How high the inner lips stand at their fullest. Lower than the outer lips, they hide between them. */
  inner: number;
  /** How far down the slit the inner lips reach, from 0 (only at the top) to 1 (all the way). */
  reach: number;
  /** How much fuller the inner lips are towards the bottom of the slit than the top: a long pair hangs low. */
  droop: number;
  /** How high the hood over the clitoris stands. */
  hood: number;
  /** How far each outer lip is parted from the middle when she's calm. */
  part: number;
}

/** The first is the default. */
export const VULVA_TYPES: VulvaType[] = [
  // The outer lips closed over the inner ones: a neat slit.
  { id: "tucked", label: "Tucked", outer: 0.0045, crest: 0.42, inner: 0.0016, reach: 0.75, droop: 0, hood: 0.0018, part: 0 },
  // Full, rounded outer lips.
  { id: "puffy", label: "Puffy", outer: 0.0075, crest: 0.48, inner: 0.0018, reach: 0.7, droop: 0, hood: 0.0018, part: 0 },
  // The inner lips show a little between the outer ones.
  { id: "peeking", label: "Peeking", outer: 0.004, crest: 0.44, inner: 0.0048, reach: 0.85, droop: 0.15, hood: 0.0024, part: 0.0004 },
  // Long inner lips, fullest low down, well past the outer ones.
  { id: "long", label: "Long lips", outer: 0.0035, crest: 0.5, inner: 0.0068, reach: 0.9, droop: 0.35, hood: 0.0026, part: 0.0008 },
  // A full hood standing out at the top of the slit.
  { id: "hooded", label: "Prominent hood", outer: 0.0042, crest: 0.44, inner: 0.0024, reach: 0.8, droop: 0, hood: 0.0048, part: 0.0002 },
];

/** Her vulva as it is shaped now: a type with her sliders and arousal put in, and how big. */
export interface VulvaShape {
  outer: number;
  crest: number;
  inner: number;
  reach: number;
  droop: number;
  hood: number;
  part: number;
  /** How much of the patch as built she fills: the patch is built at the largest size. */
  scale: number;
  /** How far her opening's sides part from the middle at the middle of the cut, in metres; 0 closed. */
  open: number;
  /** How far she's stretched past fully open, 0 to 1: the opening rounds out and the skin around it gives. */
  stretch: number;
  /** How much longer her cut grows at its top, and how deep her canal goes at its middle, in metres. */
  long: number;
  deep: number;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
/** A soft hill, 1 at 0 and gone by -1 and 1. */
const bump = (x: number) => (Math.abs(x) >= 1 ? 0 : (1 - x * x) ** 2);

/**
 * The patch's bottom edge reaches at least this far down the patch as built (as a share of its length), however
 * small she is: the skin hidden under the bottom of her opening (VULVA_HOLE in build_world.py) lies above it.
 */
const BOTTOM = 0.92;

/**
 * Where on the patch as built a place along the shape lies (`t`, 0 at its top to 1 at its bottom), at a scale: the
 * shape shrinks about the patch's middle, but under the bottom of her cut it reaches down at least to BOTTOM.
 */
function builtAt(t: number, scale: number): number {
  const cut = VULVA_CUT[1] / (VULVA_ROWS - 1);
  if (t <= cut) return 0.5 + (t - 0.5) * scale;
  const from = 0.5 + (cut - 0.5) * scale;
  return from + ((t - cut) * (Math.max(0.5 + 0.5 * scale, BOTTOM) - from)) / (1 - cut);
}

/** Where along the shape a place along the patch as built lies, at a scale: builtAt the other way round. */
function shapeAt(built: number, scale: number): number {
  const cut = VULVA_CUT[1] / (VULVA_ROWS - 1);
  const from = 0.5 + (cut - 0.5) * scale;
  if (built <= from) return 0.5 + (built - 0.5) / scale;
  return cut + ((built - from) * (1 - cut)) / (Math.max(0.5 + 0.5 * scale, BOTTOM) - from);
}

/**
 * How much of the patch as built she fills at a Size slider from -1 to 1: two thirds of it, to nearly all of it.
 * Never quite all: the patch's outermost corners lie in the notch where her thighs meet, which they close over.
 */
export function vulvaScale(size: number): number {
  const s = Math.min(1, Math.max(-1, size));
  return 0.84 + (s < 0 ? 0.16 : 0.1) * s;
}

/**
 * Eases how open her vulva or anus shows towards how open it's meant to be, `dt` seconds on: it opens and stretches
 * quickly, and closes back slowly, slowest while it's still stretched, as it gapes a while before it closes.
 */
export function easeOpening(shown: number, target: number, dt: number): number {
  const rate = target > shown ? 2.5 : shown > 1 ? 0.3 : 0.15;
  const step = Math.min(Math.abs(target - shown), rate * dt);
  return shown + Math.sign(target - shown) * step;
}

/**
 * A type with the sliders (-1 to 1), how aroused she is (0 to 1) and how open (0 closed, 1 fully, up to
 * VULVA_STRETCHED stretched) put in. Aroused, the lips swell, the inner ones most, the hood stands a little and the
 * outer lips part.
 */
export function vulvaShape(type: VulvaType, size: number, fullness: number, lips: number, arousal: number, open = 0): VulvaShape {
  const a = smooth(arousal);
  const scale = vulvaScale(size);
  // Heights grow with the size too, so a bigger one isn't flatter.
  const grow = scale / vulvaScale(0);
  const stretch = smooth(Math.min(VULVA_STRETCHED, open) - 1);
  return {
    outer: type.outer * (1 + 0.5 * fullness) * (1 + 0.12 * a) * grow,
    crest: type.crest,
    inner: type.inner * (1 + 0.45 * lips) * (1 + 0.45 * a) * grow,
    reach: Math.min(1, Math.max(0.3, type.reach + 0.2 * lips)),
    droop: type.droop,
    hood: type.hood * (1 + 0.3 * a) * grow,
    part: (type.part + 0.0012 * a) * grow,
    scale,
    // Stretched, she's as wide as what's in her, whatever her size.
    open: OPEN_HALF * smooth(open) * grow + STRETCH_HALF * stretch,
    stretch,
    long: STRETCH_LONG * stretch,
    deep: CANAL_DEPTH * grow + STRETCH_DEEP * stretch,
  };
}

/**
 * How far along the cut a row (or a place between rows) is, as a share of its middle's: 0 at its ends, where its
 * sides always meet.
 */
export function cutShare(row: number): number {
  const [top, bottom] = VULVA_CUT;
  if (row <= top || row >= bottom) return 0;
  return Math.sin((Math.PI * (row - top)) / (bottom - top));
}

/** How far across the patch (a share of its half width) the skin gives as her opening parts: further stretched. */
const giving = (shape: VulvaShape) => 0.6 + 0.4 * shape.stretch;

/**
 * How far her opening's sides part from the middle at a row (or between rows), in metres: rounder stretched, its
 * middle rows nearly as wide as the widest.
 */
function parting(shape: VulvaShape, row: number): number {
  return shape.open * cutShare(row) ** (1 - 0.4 * shape.stretch);
}

/** The slit runs this far either side of the middle of the patch, as a share of its length. */
const SLIT = 0.36;

/**
 * How high the shape stands over the skin at (s, t), and how far it moves away from the middle there: the outer
 * lips' hills either side of the slit, the inner lips along it, and the hood at its top. The highest wins.
 */
export function vulvaAt(shape: VulvaShape, s: number, t: number): { h: number; lat: number } {
  const a = Math.abs(s);
  const w = (t - 0.5) / SLIT;
  // The outer lips run the length of the slit and round off past its ends, where they meet and their crests
  // draw in towards the middle.
  const along = 1 - smooth((Math.abs(w) - 0.75) / 0.55);
  const crest = shape.crest * (1 - 0.55 * smooth((Math.abs(w) - 0.35) / 0.9));
  const floor = crest * 0.38;
  const across = a < crest ? smooth((a - floor) / (crest - floor)) : 1 - smooth((a - crest) / (1 - crest));
  const outer = shape.outer * along * across;
  // The inner lips, from the hood down as far as they reach, each side of a crease in the middle. Every pair draws
  // in towards the bottom, where her thighs close in and would sweep over anything standing out as she walks.
  const end = -1 + 2 * shape.reach;
  const length = smooth((w + 1.05) / 0.3) * (1 - smooth((w - end) / 0.35)) * (1 - smooth((w - 0.7) / 0.45));
  const low = 1 + shape.droop * Math.max(-0.5, Math.min(0.6, w));
  const inner = shape.inner * length * low * bump((a - 0.08) / 0.17);
  // The hood at the top of the slit.
  const hood = shape.hood * bump(a / 0.24) * bump((w + 0.85) / 0.3);
  const lat = shape.part * along * smooth(a / 0.25) * (1 - smooth((a - 0.45) / 0.55));
  return { h: Math.max(outer, inner, hood), lat };
}

/** Whether the face between these columns and rows is part of the slit (T_vulva): VULVA_INNER in build_world.py. */
export function isInner(column: number, row: number): boolean {
  const s = (VULVA_COLUMNS[column] + VULVA_COLUMNS[column + 1]) / 2;
  const t = (row + 0.5) / (VULVA_ROWS - 1);
  return Math.abs(s) < 0.2 && Math.abs(t - 0.5) < SLIT * 0.92;
}

/** The patch as built: which grid point each corner of each of its meshes is, and one corner for each point. */
export interface VulvaPatch {
  /** For each mesh of the grid, the grid point (column + row * columns) of each of its corners. */
  points: Int32Array[];
  /** For each mesh of the grid, which side of the cut each corner is on: -1 left, 1 right, 0 off the cut. */
  sides: Int8Array[];
  /** For each grid point, a mesh and a corner in it: two numbers each. */
  pick: Int32Array;
  /** The canal's corners, if it was built: each one's place across it (0 to VULVA_CANAL + 1) and its row. */
  canal: { across: Uint8Array; rows: Uint8Array } | null;
}

interface UvLike {
  count: number;
  getX(index: number): number;
  getY(index: number): number;
}

/**
 * Finds the grid in the patch's meshes from their UVs (which glTF stores upside down), and the canal in its mesh if
 * given. Null if the grid is incomplete.
 */
export function readVulva(uvs: UvLike[], canalUv?: UvLike): VulvaPatch | null {
  const pick = new Int32Array(VULVA_GRID * 2).fill(-1);
  const sides: Int8Array[] = [];
  const points = uvs.map((uv, mesh) => {
    const list = new Int32Array(uv.count);
    const side = new Int8Array(uv.count);
    for (let v = 0; v < uv.count; v++) {
      const at = uv.getX(v) * (COLS - 1);
      const column = Math.min(COLS - 1, Math.max(0, Math.round(at)));
      const row = Math.min(VULVA_ROWS - 1, Math.max(0, Math.round((1 - uv.getY(v)) * (VULVA_ROWS - 1))));
      const g = column + row * COLS;
      list[v] = g;
      side[v] = at - column < -0.1 ? -1 : at - column > 0.1 ? 1 : 0;
      if (pick[g * 2] < 0) {
        pick[g * 2] = mesh;
        pick[g * 2 + 1] = v;
      }
    }
    sides.push(side);
    return list;
  });
  if (pick.includes(-1)) return null;
  let canal: VulvaPatch["canal"] = null;
  if (canalUv) {
    const across = new Uint8Array(canalUv.count);
    const rows = new Uint8Array(canalUv.count);
    for (let v = 0; v < canalUv.count; v++) {
      across[v] = Math.min(VULVA_CANAL + 1, Math.max(0, Math.round(canalUv.getX(v) * (VULVA_CANAL + 1))));
      rows[v] = Math.min(VULVA_ROWS - 1, Math.max(0, Math.round((1 - canalUv.getY(v)) * (VULVA_ROWS - 1))));
    }
    canal = { across, rows };
  }
  return { points, sides, pick, canal };
}

/** The grid's points out of the meshes' positions (`on`, one array per mesh), three numbers each. */
export function gridOf(patch: VulvaPatch, on: Float32Array[]): Float32Array {
  const grid = new Float32Array(VULVA_GRID * 3);
  for (let g = 0; g < VULVA_GRID; g++) {
    const at = patch.pick[g * 2 + 1] * 3;
    const from = on[patch.pick[g * 2]];
    grid[g * 3] = from[at];
    grid[g * 3 + 1] = from[at + 1];
    grid[g * 3 + 2] = from[at + 2];
  }
  return grid;
}

/** The column, as a fraction between columns, where `s` lies. */
function columnAt(s: number): number {
  const c = Math.min(1, Math.max(-1, s));
  for (let i = 0; i < COLS - 1; i++) {
    if (c <= VULVA_COLUMNS[i + 1]) return i + (c - VULVA_COLUMNS[i]) / (VULVA_COLUMNS[i + 1] - VULVA_COLUMNS[i]);
  }
  return COLS - 1;
}

/** The skin at (s, t) on the patch as built, between the grid's points. */
function sample(grid: Float32Array, s: number, t: number, out: Float32Array, at: number): void {
  const fc = columnAt(s);
  const fr = Math.min(VULVA_ROWS - 1, Math.max(0, t * (VULVA_ROWS - 1)));
  const c = Math.min(COLS - 2, Math.floor(fc));
  const r = Math.min(VULVA_ROWS - 2, Math.floor(fr));
  const u = fc - c;
  const v = fr - r;
  for (let k = 0; k < 3; k++) {
    const p00 = grid[(c + r * COLS) * 3 + k];
    const p10 = grid[(c + 1 + r * COLS) * 3 + k];
    const p01 = grid[(c + (r + 1) * COLS) * 3 + k];
    const p11 = grid[(c + 1 + (r + 1) * COLS) * 3 + k];
    out[at + k] = (p00 * (1 - u) + p10 * u) * (1 - v) + (p01 * (1 - u) + p11 * u) * v;
  }
}

/** Which way is out of her at the groin in the model's space: forwards (-z) and down (-y). */
const OUT = [0, -Math.SQRT1_2, -Math.SQRT1_2];

/**
 * For each point of a grid, the way out of the skin there and the way across it towards +s, from its neighbours.
 * Unit vectors, three numbers each.
 */
function frames(grid: Float32Array): { normals: Float32Array; across: Float32Array } {
  const normals = new Float32Array(VULVA_GRID * 3);
  const across = new Float32Array(VULVA_GRID * 3);
  const p = (c: number, r: number, k: number) => grid[(c + r * COLS) * 3 + k];
  let facing = 0;
  for (let r = 0; r < VULVA_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const c0 = Math.max(0, c - 1), c1 = Math.min(COLS - 1, c + 1);
      const r0 = Math.max(0, r - 1), r1 = Math.min(VULVA_ROWS - 1, r + 1);
      const ax = p(c1, r, 0) - p(c0, r, 0), ay = p(c1, r, 1) - p(c0, r, 1), az = p(c1, r, 2) - p(c0, r, 2);
      const tx = p(c, r1, 0) - p(c, r0, 0), ty = p(c, r1, 1) - p(c, r0, 1), tz = p(c, r1, 2) - p(c, r0, 2);
      let nx = ay * tz - az * ty, ny = az * tx - ax * tz, nz = ax * ty - ay * tx;
      const n = Math.hypot(nx, ny, nz) || 1;
      nx /= n; ny /= n; nz /= n;
      const g = (c + r * COLS) * 3;
      normals.set([nx, ny, nz], g);
      facing += nx * OUT[0] + ny * OUT[1] + nz * OUT[2];
      const l = Math.hypot(ax, ay, az) || 1;
      across.set([ax / l, ay / l, az / l], g);
    }
  }
  // One way round for the whole grid, so no point flips on its own where the skin creases.
  if (facing < 0) for (let i = 0; i < normals.length; i++) normals[i] = -normals[i];
  return { normals, across };
}

/** How wide each row of a grid is either side of its middle column, and how long the middle column is, in metres. */
function measure(grid: Float32Array): { halves: Float32Array; length: number } {
  const p = (c: number, r: number) => (c + r * COLS) * 3;
  const gap = (a: number, b: number) => Math.hypot(grid[a] - grid[b], grid[a + 1] - grid[b + 1], grid[a + 2] - grid[b + 2]);
  const halves = new Float32Array(VULVA_ROWS);
  let length = 0;
  for (let r = 0; r < VULVA_ROWS; r++) {
    let arc = 0;
    for (let c = 0; c < COLS - 1; c++) arc += gap(p(c, r), p(c + 1, r));
    halves[r] = Math.max(1e-4, arc / 2);
    if (r > 0) length += gap(p((COLS - 1) / 2, r), p((COLS - 1) / 2, r - 1));
  }
  return { halves, length: Math.max(1e-4, length) };
}

/** The way out of the skin, and how the skin has given as she opens, over the grid: for what rides over it. */
export interface VulvaFrame {
  /** The way out of the skin at each point of the grid as built: unit vectors, three numbers each. */
  normals: Float32Array;
  /** How far each point of the grid as she fills it has moved over her skin as she opens, three numbers each. */
  slide: Float32Array;
}

/**
 * Lays the patch into a shape. `on` is where each corner of its meshes lies on the skin now, after the body's own
 * reshaping, in the model's space: the grid's meshes, then the canal's if it has one. The shaped corners are written
 * into `out`, one array per mesh likewise. With no shape it lies flat on the skin, closed.
 *
 * As she opens, the skin around the cut gives: each point takes the skin from further out across the patch (and,
 * stretched, further up it from the cut's bottom), less the further it lies from the cut and none at the patch's
 * edges. No point passes its neighbour, and every one stays on her skin however it curves.
 */
export function shapeVulva(patch: VulvaPatch, on: Float32Array[], shape: VulvaShape | null, out: Float32Array[]): VulvaFrame {
  const skin = gridOf(patch, on);
  const scale = shape?.scale ?? 1;
  const { halves, length } = measure(skin);
  const [top, bottom] = VULVA_CUT;
  const reach = shape ? giving(shape) : 1;
  /** How far across the skin a point gives, as a share of the patch's half width, for its column and row. */
  const across = (s: number, r: number): number => {
    if (!shape || !shape.open) return 0;
    const at = builtAt(r / (VULVA_ROWS - 1), scale) * (VULVA_ROWS - 1);
    const low = Math.min(VULVA_ROWS - 2, Math.max(0, Math.floor(at)));
    const half = halves[low] + (halves[low + 1] - halves[low]) * (at - low);
    // Never so far that a column passes the one outside it: the falloff is at its steepest 1.5 times its height.
    const most = Math.min(parting(shape, r) / half, 0.6 * scale * reach);
    return most * (1 - smooth(Math.abs(s) / reach));
  };
  /**
   * How far along the skin a point gives, stretched, as a share of the patch's length: up from the cut's bottom,
   * the most at its top, fading out above it to none at the patch's top.
   */
  const cutTop = top / (VULVA_ROWS - 1);
  const cutBottom = bottom / (VULVA_ROWS - 1);
  const along = (s: number, t: number): number => {
    if (!shape || !shape.long || t >= cutBottom) return 0;
    const most = Math.min(shape.long / length, 0.6 * scale * cutTop);
    const away = t >= cutTop ? (cutBottom - t) / (cutBottom - cutTop) : 1 - smooth((cutTop - t) / cutTop);
    return -most * away * (1 - smooth(Math.abs(s) / reach));
  };
  // Each point takes the skin from the part of the patch she fills, as it gives.
  const plain = new Float32Array(VULVA_GRID * 3);
  const placed = new Float32Array(VULVA_GRID * 3);
  for (let r = 0; r < VULVA_ROWS; r++) {
    const t = r / (VULVA_ROWS - 1);
    for (let c = 0; c < COLS; c++) {
      const s = VULVA_COLUMNS[c];
      const g = (c + r * COLS) * 3;
      sample(skin, s * scale, builtAt(t, scale), plain, g);
      sample(skin, s * scale + Math.sign(s) * across(s, r), builtAt(t, scale) + along(s, t), placed, g);
    }
  }
  const { normals, across: ways } = frames(placed);
  const shaped = new Float32Array(VULVA_GRID * 3);
  for (let r = 0; r < VULVA_ROWS; r++) {
    const t = r / (VULVA_ROWS - 1);
    for (let c = 0; c < COLS; c++) {
      const s = VULVA_COLUMNS[c];
      const { h, lat } = shape ? vulvaAt(shape, s, t) : { h: 0, lat: 0 };
      const g = (c + r * COLS) * 3;
      for (let k = 0; k < 3; k++) shaped[g + k] = placed[g + k] + normals[g + k] * (h + LIFT) + ways[g + k] * Math.sign(s) * lat;
    }
  }
  // The cut's two sides, each on the skin its own way from the middle: left then right, for each row.
  const middle = (COLS - 1) / 2;
  const sides = new Float32Array(VULVA_ROWS * 6);
  for (let r = 0; r < VULVA_ROWS; r++) {
    const t = r / (VULVA_ROWS - 1);
    const g = (middle + r * COLS) * 3;
    const h = shape ? vulvaAt(shape, 0, t).h : 0;
    for (const side of [0, 1]) {
      const at = (r * 2 + side) * 3;
      sample(skin, (side ? 1 : -1) * across(0, r), builtAt(t, scale) + along(0, t), sides, at);
      for (let k = 0; k < 3; k++) sides[at + k] += normals[g + k] * (h + LIFT);
    }
  }
  patch.points.forEach((points, mesh) => {
    const target = out[mesh];
    const cut = patch.sides[mesh];
    for (let v = 0; v < points.length; v++) {
      const from = cut[v] ? sides : shaped;
      const at = cut[v] ? (Math.floor(points[v] / COLS) * 2 + (cut[v] < 0 ? 0 : 1)) * 3 : points[v] * 3;
      for (let k = 0; k < 3; k++) target[v * 3 + k] = from[at + k];
    }
  });
  // Her canal: across each row of the cut from its left side down into her and back up to its right, narrowing as
  // it goes in. Closed, both sides are one and it lies flat, edge on, out of sight.
  const { canal } = patch;
  const target = out[patch.points.length];
  if (canal && target) {
    const deep = shape ? shape.deep : CANAL_DEPTH;
    for (let v = 0; v < canal.across.length; v++) {
      const row = canal.rows[v];
      const g = (middle + row * COLS) * 3;
      const cut = row > top && row < bottom;
      const a = (Math.PI * canal.across[v]) / (VULVA_CANAL + 1);
      const wide = -Math.cos(a) * (1 - 0.3 * Math.sin(a));
      // Shallow at the cut's ends, where it closes into a wall, so the wall stays behind the skin under the slit.
      const down = Math.sin(a) * deep * (0.1 + 0.9 * cutShare(row));
      for (let k = 0; k < 3; k++) {
        const left = cut ? sides[row * 6 + k] : shaped[g + k];
        const right = cut ? sides[row * 6 + 3 + k] : shaped[g + k];
        target[v * 3 + k] = (left + right) / 2 + ((right - left) / 2) * wide - normals[g + k] * down;
      }
    }
  }
  const slide = new Float32Array(VULVA_GRID * 3);
  for (let i = 0; i < slide.length; i++) slide[i] = placed[i] - plain[i];
  return { normals: frames(skin).normals, slide };
}

/**
 * The points of another mesh lying over the patch (its coat, clothes or pubic hair), with the grid points nearest
 * each and where on the patch it lies, so they rise over the shape instead of sinking into it.
 */
export interface VulvaRiders {
  verts: Int32Array;
  /** Four grid points for each, and how much each counts. */
  near: Int32Array;
  weights: Float32Array;
  /** Where on the patch as built each lies. */
  s: Float32Array;
  t: Float32Array;
}

const NEAR = 4;

/** The points of a mesh (`bind`) within reach of the patch's grid as built (`grid`); null for none. */
export function vulvaRiders(bind: Float32Array, grid: Float32Array, reach = VULVA_RIDE): VulvaRiders | null {
  const verts: number[] = [], near: number[] = [], weights: number[] = [], ss: number[] = [], ts: number[] = [];
  const best = new Int32Array(NEAR);
  const dist = new Float32Array(NEAR);
  // Only points within reach of the grid's box are worth measuring.
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (let g = 0; g < VULVA_GRID; g++) {
    for (let k = 0; k < 3; k++) {
      low[k] = Math.min(low[k], grid[g * 3 + k] - reach);
      high[k] = Math.max(high[k], grid[g * 3 + k] + reach);
    }
  }
  for (let v = 0; v < bind.length / 3; v++) {
    let out = false;
    for (let k = 0; k < 3; k++) out ||= bind[v * 3 + k] < low[k] || bind[v * 3 + k] > high[k];
    if (out) continue;
    best.fill(-1);
    dist.fill(Infinity);
    for (let g = 0; g < VULVA_GRID; g++) {
      const d = Math.hypot(bind[v * 3] - grid[g * 3], bind[v * 3 + 1] - grid[g * 3 + 1], bind[v * 3 + 2] - grid[g * 3 + 2]);
      if (d >= dist[NEAR - 1]) continue;
      let k = NEAR - 1;
      while (k > 0 && dist[k - 1] > d) {
        dist[k] = dist[k - 1];
        best[k] = best[k - 1];
        k--;
      }
      dist[k] = d;
      best[k] = g;
    }
    if (dist[0] > reach) continue;
    let total = 0;
    const w = Array.from(dist, (d) => 1 / Math.max(1e-5, d));
    for (const x of w) total += x;
    let s = 0, t = 0;
    for (let k = 0; k < NEAR; k++) {
      const g = best[k];
      s += VULVA_COLUMNS[g % COLS] * (w[k] / total);
      t += (Math.floor(g / COLS) / (VULVA_ROWS - 1)) * (w[k] / total);
    }
    verts.push(v);
    for (let k = 0; k < NEAR; k++) {
      near.push(best[k]);
      weights.push(w[k] / total);
    }
    ss.push(s);
    ts.push(t);
  }
  if (!verts.length) return null;
  return {
    verts: Int32Array.from(verts), near: Int32Array.from(near), weights: Float32Array.from(weights),
    s: Float32Array.from(ss), t: Float32Array.from(ts),
  };
}

/**
 * How far each rider rises over the shape along the skin's way out, and moves over the skin as she opens (`frame`,
 * from shapeVulva): as high as the shape stands under it, and `over` more where it lies over the patch, to stay on
 * top of it. Three numbers each.
 */
export function rideVulva(riders: VulvaRiders, frame: VulvaFrame, shape: VulvaShape | null, over = 0): Float32Array {
  const out = new Float32Array(riders.verts.length * 3);
  if (!shape) return out;
  const { normals, slide } = frame;
  const moved = new Float32Array(3);
  for (let i = 0; i < riders.verts.length; i++) {
    // Where it lies on the shape, which fills only part of the patch as built.
    const s = riders.s[i] / shape.scale;
    const t = shapeAt(riders.t[i], shape.scale);
    const inside = 1 - smooth((Math.max(Math.abs(s), Math.abs(2 * t - 1)) - 0.85) / 0.15);
    if (inside <= 0) continue;
    const cs = Math.max(-1, Math.min(1, s));
    const ct = Math.max(0, Math.min(1, t));
    const h = vulvaAt(shape, cs, ct).h + over * inside;
    // It goes where the skin under it has gone as she opens.
    sample(slide, cs, ct, moved, 0);
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < NEAR; k++) {
      const g = riders.near[i * NEAR + k] * 3;
      const w = riders.weights[i * NEAR + k];
      nx += normals[g] * w;
      ny += normals[g + 1] * w;
      nz += normals[g + 2] * w;
    }
    const n = Math.hypot(nx, ny, nz) || 1;
    out[i * 3] = (nx / n) * h + moved[0];
    out[i * 3 + 1] = (ny / n) * h + moved[1];
    out[i * 3 + 2] = (nz / n) * h + moved[2];
  }
  return out;
}
