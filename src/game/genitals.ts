/**
 * His penis and scrotum as a real mesh (2026-11-23): the male reference's, cut out by
 * tools/blender/mpfb_male/ref_genitals.py and laid on his skin by mpfb_swap.py's lay_genitals. As built it is hard,
 * standing straight out of him; this bends and scales it for how aroused he is and his sliders, on the skin as it is
 * at that moment, in place of the old tube and sack (penis.ts shapePenis, still used for a model built with those).
 *
 * Each corner carries, in its second UV map ("Rig", three.js "uv1"), u: how far along the shaft it is as a share of
 * its length (0 at the root, 1 at the tip, below 0 behind the root) and, for the sack, v: how far down the sack it
 * hangs (0 at its top, 1 at its bottom; glTF stores v upside down). The shaft is laid along a curved middle line
 * (penisAngle: hanging soft, standing hard), each corner keeping its place round the line, scaled for its length,
 * girth and the type's taper, glans, knot and point. The sack hangs lower soft and draws up tight hard. The first
 * few per cent of the shaft and the top of the sack stay where they are, so it grows out of his skin.
 *
 * NOT CLEARED FOR RELEASE: the mesh and texture are a dev placeholder (see CREDITS.md).
 */
import { PENIS_TYPES, penisAngle, penisShape, type PenisShape } from "./penis";

type Vec = [number, number, number];
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));
const smooth = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface UvLike {
  count: number;
  getX(index: number): number;
  getY(index: number): number;
}

/** The mesh as built: per mesh (the shaft's, the glans', the sack's), each corner's share along the shaft or down the sack. */
export interface GenitalRig {
  /** Per mesh: u (the shaft's share along it) or, for the sack, how far down it. */
  along: Float32Array[];
  sack: boolean[];
  /** Where the glans starts, as a share of the shaft's length. */
  sulcus: number;
  /** For each shaft corner on the seam with the sack, the sack corner it lies on (mesh, corner), else -1. */
  weld: Int32Array[];
}

/** The share along the shaft the root's ring is fitted between, and the shaft's middle (both short of the glans). */
const FIT_NEAR = [0.12, 0.3] as const;
const FIT_FAR = [0.45, 0.65] as const;
/** Over this share of the shaft from its root, it eases from as built into its shape: where it grows out of him. */
const ROOT_EASE = 0.12;
/** Over this share, its girth eases in from as built. */
const GIRTH_EASE = 0.18;
/** Over this much of the sack from its top, it eases from as built into its shape. */
const SACK_EASE = 0.35;
/**
 * The sack as built is relaxed; penisShape draws it up tight as he hardens. How much of its change in how low it
 * hangs this mesh takes (the reference's hangs close already).
 */
const SACK_HANG = 0.7;
/** Soft, how far clear of the sack's front the shaft's middle stays, as a share of its radius. */
const SACK_CLEAR = 1.1;
/** Where the glans' own size eases in: from this share of the shaft behind the sulcus, over this share. */
const GLANS_BLEND = [0.1, 0.16] as const;
/** A pointed glans (penisShape point 1) narrows this much towards its tip. */
const POINT_NARROWS = 0.4;
/** How much of its hard size the glans keeps as he softens, over what the shaft's girth keeps. */
const GLANS_KEEPS = 0.35;
/** Held in his clothes, how much of how far it stands out of him is pressed back (half of that while hard). */
const PACKED_PRESS = 0.55;
/** Held in his clothes, the sack drawn up this far (metres at its bottom) and this much shorter, so it stays above their crotch. */
const PACKED_SACK = { lift: 0.022, height: 0.8 } as const;

/**
 * Reads the rig from each mesh's "Rig" UVs (null where a mesh has none), which of them are the sack's, and where
 * each corner lies as built (`bind`, to find the seam between shaft and sack). Null if it's incomplete.
 */
export function readGenitals(rig: (UvLike | null | undefined)[], sack: boolean[], bind: Float32Array[]): GenitalRig | null {
  if (rig.some((uv) => !uv) || !sack.some(Boolean) || !sack.some((s) => !s)) return null;
  const along = rig.map((uv, m) => {
    const out = new Float32Array(uv!.count);
    for (let v = 0; v < uv!.count; v++) out[v] = sack[m] ? 1 - uv!.getY(v) : uv!.getX(v);
    return out;
  });
  // The shaft's u must reach its tip, and the sack's v its bottom.
  let tip = -Infinity;
  let bottom = -Infinity;
  let sulcus = Infinity;
  along.forEach((a, m) => {
    for (const x of a) {
      if (sack[m]) bottom = Math.max(bottom, x);
      else tip = Math.max(tip, x);
    }
  });
  if (tip < 0.9 || bottom < 0.9) return null;
  // The glans is the last shaft mesh: where its corners start.
  const glans = sack.lastIndexOf(false);
  for (const x of along[glans]) sulcus = Math.min(sulcus, x);
  if (!(sulcus > 0.4 && sulcus < 1)) sulcus = 0.78;
  // The seam between shaft and sack: shaft corners lying where a sack corner does.
  const key = (p: Float32Array, v: number) =>
    `${Math.round(p[v * 3] * 1e5)},${Math.round(p[v * 3 + 1] * 1e5)},${Math.round(p[v * 3 + 2] * 1e5)}`;
  const sackAt = new Map<string, number>();
  bind.forEach((p, m) => {
    if (!sack[m]) return;
    for (let v = 0; v < p.length / 3; v++) sackAt.set(key(p, v), m * 1e7 + v);
  });
  const weld = bind.map((p, m) => {
    const w = new Int32Array(p.length / 3).fill(-1);
    if (sack[m]) return w;
    for (let v = 0; v < w.length; v++) {
      const at = sackAt.get(key(p, v));
      if (at !== undefined) w[v] = at;
    }
    return w;
  });
  return { along, sack, sulcus, weld };
}

/** Where it leaves him and its ways (out of him along the shaft as built, up, across to +x), and the shaft's length. */
export interface GenitalFrame {
  root: Vec;
  out: Vec;
  up: Vec;
  side: Vec;
  length: number;
}

/** The frame from where its corners lie now (`on`, one array per mesh). */
export function genitalFrame(rig: GenitalRig, on: Float32Array[]): GenitalFrame {
  const near: Vec = [0, 0, 0];
  const far: Vec = [0, 0, 0];
  let nn = 0;
  let nf = 0;
  let tn = 0;
  let tf = 0;
  rig.along.forEach((a, m) => {
    if (rig.sack[m]) return;
    const p = on[m];
    for (let v = 0; v < a.length; v++) {
      const t = a[v];
      if (t >= FIT_NEAR[0] && t <= FIT_NEAR[1]) {
        near[0] += p[v * 3];
        near[1] += p[v * 3 + 1];
        near[2] += p[v * 3 + 2];
        tn += t;
        nn++;
      } else if (t >= FIT_FAR[0] && t <= FIT_FAR[1]) {
        far[0] += p[v * 3];
        far[1] += p[v * 3 + 1];
        far[2] += p[v * 3 + 2];
        tf += t;
        nf++;
      }
    }
  });
  const a = near.map((x) => x / Math.max(1, nn)) as Vec;
  const b = far.map((x) => x / Math.max(1, nf)) as Vec;
  const span = add(b, a, -1);
  const out = unit(span);
  const length = Math.hypot(...span) / Math.max(1e-6, tf / Math.max(1, nf) - tn / Math.max(1, nn));
  const root = add(a, out, -(tn / Math.max(1, nn)) * length);
  // Up is up in the model (+y), square to the way out.
  const up = unit(add([0, 1, 0], out, -out[1]));
  return { root, out, up, side: cross(out, up), length };
}

/** The type the reference is, hard, and soft: what the shape's sizes are measured against (the reference as built). */
const REF_TYPE = PENIS_TYPES.find((t) => t.id === "cut") ?? PENIS_TYPES[0];
const REF_HARD = penisShape(REF_TYPE, 0, 0, 0, 0, 0, 0, 1);
const REF_SOFT = penisShape(REF_TYPE, 0, 0, 0, 0, 0, 0, 0);

/**
 * Lays the mesh into `shape` (penis.ts penisShape: a type with his sliders and arousal put in). `on` is where each
 * corner lies on the skin now, in the model's space; the shaped corners go into `out`, one array per mesh.
 */
export function shapeGenitals(rig: GenitalRig, on: Float32Array[], shape: PenisShape, out: Float32Array[]): void {
  const frame = genitalFrame(rig, on);
  const { root, side, up } = frame;
  const level = frame.out;
  const L = frame.length;
  const kL = shape.length / REF_HARD.length;
  const kG = shape.radius / REF_HARD.radius;
  const glansShare = shape.glans / shape.length / (REF_HARD.glans / REF_HARD.length);
  const flare = shape.flare / REF_HARD.flare;
  const taper = shape.taper - REF_HARD.taper;
  const sulcus = rig.sulcus;
  // The glans shrinks far less than the shaft as he softens.
  const kGl = lerp(kG, 1, GLANS_KEEPS);

  // The sack first, so the shaft can rest on it: its middle, then each corner scaled about it and hung.
  const sw = shape.sack.width / REF_SOFT.sack.width;
  const sh = (shape.sack.height / REF_SOFT.sack.height) * lerp(1, PACKED_SACK.height, shape.packed);
  const sd = shape.sack.depth / REF_SOFT.sack.depth;
  const hang = (shape.sack.hang - REF_SOFT.sack.hang) * SACK_HANG - PACKED_SACK.lift * shape.packed;
  const centre: Vec = [0, 0, 0];
  let nc = 0;
  rig.along.forEach((a, m) => {
    if (!rig.sack[m]) return;
    for (let v = 0; v < a.length; v++) {
      if (a[v] < 0.4) continue;
      centre[0] += on[m][v * 3];
      centre[1] += on[m][v * 3 + 1];
      centre[2] += on[m][v * 3 + 2];
      nc++;
    }
  });
  for (let i = 0; i < 3; i++) centre[i] /= Math.max(1, nc);
  // The front of the sack at each height below the root (2 mm bands), near the middle: for the shaft to rest on.
  const BAND = 0.002;
  const fronts = new Map<number, number>();
  rig.along.forEach((a, m) => {
    if (!rig.sack[m]) return;
    const p = on[m];
    const o = out[m];
    for (let v = 0; v < a.length; v++) {
      const at: Vec = [p[v * 3], p[v * 3 + 1], p[v * 3 + 2]];
      const w = smooth(a[v] / SACK_EASE);
      const d = add(at, centre, -1);
      const x = dot(d, side);
      const y = dot(d, up);
      const z = dot(d, level);
      let q = add(add(add(centre, side, x * lerp(1, sw, w)), up, y * lerp(1, sh, w)), level, z * lerp(1, sd, w));
      q = add(q, up, -hang * w * a[v]);
      o[v * 3] = q[0];
      o[v * 3 + 1] = q[1];
      o[v * 3 + 2] = q[2];
      if (Math.abs(dot(add(q, root, -1), side)) < shape.radius * 1.2) {
        const band = Math.round(dot(add(q, root, -1), up) / BAND);
        fronts.set(band, Math.max(fronts.get(band) ?? -Infinity, dot(add(q, root, -1), level)));
      }
    }
  });

  // The shaft's middle line: from the root, each step turned to penisAngle, resting on the front of the sack.
  const total = (sulcus * kL + (1 - sulcus) * kGl * glansShare) * L;
  const steps = 96;
  const step = (total * 1.05) / steps;
  // (penisAngle reads s as a share of the shape's length: this mesh's, measured)
  const bend = { ...shape, length: L * kL };
  const line: Vec[] = [root];
  for (let i = 0; i < steps; i++) {
    const phi = penisAngle(bend, (i + 0.5) * step);
    line.push(add(line[i], add(add([0, 0, 0], level, Math.cos(phi)), up, Math.sin(phi)), step));
  }
  const radius = shape.radius;
  let pushed = 0;
  const needs = line.map((p, i) => {
    if (i === 0) return 0;
    const rel = add(p, root, -1);
    const front = fronts.get(Math.round(dot(rel, up) / BAND));
    if (front !== undefined) pushed = Math.max(pushed, front + radius * SACK_CLEAR - dot(rel, level));
    return pushed;
  });
  const LEAD = 12;
  const moved = line.map((p, i) => {
    let move = needs[i];
    for (let j = i + 1; j <= Math.min(line.length - 1, i + LEAD); j++) move = Math.max(move, needs[j] * smooth(1 - (j - i) / LEAD));
    return move > 0 ? add(p, level, move * smooth(i / 8)) : p;
  });
  // The way it runs at each point, smoothed over a few steps.
  const ways: Vec[] = moved.map((_, i) => {
    let sum: Vec = [0, 0, 0];
    for (let j = Math.max(0, i - 3); j <= Math.min(moved.length - 2, i + 3); j++) sum = add(sum, unit(add(moved[j + 1], moved[j], -1)));
    return unit(sum);
  });
  const along = (s: number): { at: Vec; way: Vec } => {
    const f = clamp(s / step, 0, moved.length - 1.001);
    const i = Math.floor(f);
    const k = f - i;
    const next = ways[Math.min(i + 1, ways.length - 1)];
    return { at: add(moved[i], add(moved[i + 1], moved[i], -1), k), way: unit(add(ways[i], add(next, ways[i], -1), k)) };
  };

  // Held in his clothes, whatever stands out in front of where it leaves him is pressed back towards him.
  const press = PACKED_PRESS * shape.packed * (1 - 0.5 * shape.stand);
  const pressed = (p: Vec): Vec => {
    const d = dot(add(p, root, -1), level);
    return d > 0 && press > 0 ? add(p, level, -d * press) : p;
  };

  rig.along.forEach((a, m) => {
    if (rig.sack[m]) return;
    const p = on[m];
    const o = out[m];
    for (let v = 0; v < a.length; v++) {
      const t = a[v];
      const at: Vec = [p[v * 3], p[v * 3 + 1], p[v * 3 + 2]];
      let q: Vec = at;
      if (t > 0) {
        const rel = add(at, root, -1);
        const u = dot(rel, up);
        const x = dot(rel, side);
        // Along the line: the shaft scaled to its length, the glans past the sulcus to its own.
        const s = t <= sulcus ? t * L * kL : (sulcus * kL + (t - sulcus) * kGl * glansShare) * L;
        // Round it: its girth eased in from the root, tapering, swelling at a knot, the glans flared or pointed.
        const g = smooth(t / GIRTH_EASE);
        // (the glans' own size eased in from a little behind the sulcus, so the shaft runs into it without a step)
        const gl = smooth((t - sulcus + GLANS_BLEND[0]) / GLANS_BLEND[1]);
        const toTip = clamp((t - sulcus) / Math.max(1e-3, 1 - sulcus), 0, 1);
        let r = lerp(1, kG * (1 - taper * t) * (1 + 0.4 * shape.knot * Math.exp(-(((t - 0.12) / 0.07) ** 2))), g);
        r = lerp(r, kGl * (1 - taper * sulcus) * flare, gl) * (1 - shape.point * POINT_NARROWS * toTip ** 1.4);
        const { at: c, way } = along(s);
        const normal = unit(cross(side, way));
        const shaped = add(add(c, normal, u * r), side, x * r);
        // Where it grows out of him, eased from as built.
        const e = smooth(t / ROOT_EASE);
        q = [lerp(at[0], shaped[0], e), lerp(at[1], shaped[1], e), lerp(at[2], shaped[2], e)];
      }
      q = pressed(q);
      o[v * 3] = q[0];
      o[v * 3 + 1] = q[1];
      o[v * 3 + 2] = q[2];
    }
  });
  rig.along.forEach((a, m) => {
    if (!rig.sack[m]) return;
    const o = out[m];
    for (let v = 0; v < a.length; v++) {
      const q = pressed([o[v * 3], o[v * 3 + 1], o[v * 3 + 2]]);
      o[v * 3] = q[0];
      o[v * 3 + 1] = q[1];
      o[v * 3 + 2] = q[2];
    }
  });
  // The shaft's corners on the seam with the sack, exactly where the sack's are.
  rig.weld.forEach((w, m) => {
    for (let v = 0; v < w.length; v++) {
      if (w[v] < 0) continue;
      const sm = Math.floor(w[v] / 1e7);
      const sv = w[v] % 1e7;
      out[m][v * 3] = out[sm][sv * 3];
      out[m][v * 3 + 1] = out[sm][sv * 3 + 1];
      out[m][v * 3 + 2] = out[sm][sv * 3 + 2];
    }
  });
}
