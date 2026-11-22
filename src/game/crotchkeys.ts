/**
 * Her vulva's and anus's shape keys, four each, sculpted in Blender (art/female_crotch_keys.blend) and written out by
 * tools/blender/tarven_bridge/crotch_keys.py to public/models/female_crotch.json, in the face keys' format (facekeys.ts):
 *
 *   <Part>_Close    clenched shut, tighter than at rest
 *   <Part>_Open     open round something in her: 1 fully open, up to 2 stretched (Dresser.setOpening)
 *   <Part>_SpreadL  her own left side pulled open by a hand; SpreadR her right; both, two hands (Dresser.setHold)
 *
 * The Dresser lays them over her vulva's and anus's own meshes as it shapes them (so their light and what rides on them
 * follow), each key's moves scaled by how much of it she shows. With the keys, Open takes the place of the game's own
 * opening (vulva.ts, anus.ts), which shreds the skin round the hand-sculpted vulva.
 */
import type { Matrix4 } from "three";
import { floats, ints, pointFinder, type FaceKeyObject, type FaceKeysFile } from "./facekeys";

export type CrotchPart = "Vulva" | "Anus";
export const CROTCH_KEY_KINDS = ["Close", "Open", "SpreadL", "SpreadR"] as const;
export type CrotchKeyKind = (typeof CROTCH_KEY_KINDS)[number];

/** What's holding her: a clench, and a hand at each side, from 0 to 1, for her vulva and her anus. */
export interface CrotchHold {
  close: number;
  left: number;
  right: number;
}
export interface CrotchHolds {
  vulva: CrotchHold;
  anus: CrotchHold;
}
export const NO_HOLD: Readonly<CrotchHold> = { close: 0, left: 0, right: 0 };
export const NO_HOLDS: Readonly<CrotchHolds> = { vulva: NO_HOLD, anus: NO_HOLD };

/** The loaded keys, by body ("Female"); null until loaded, or when there's no file. */
const loaded = new Map<string, FaceKeysFile>();

export function setCrotchKeys(body: string, file: FaceKeysFile | null): void {
  if (file) loaded.set(body, file);
  else loaded.delete(body);
}

export function crotchKeysOf(body: string): FaceKeysFile | null {
  return loaded.get(body) ?? null;
}

/** Fetches a body's crotch keys (models/<body>_crotch.json); without them the game opens her its own way. */
export async function loadCrotchKeys(base: string, body: string): Promise<void> {
  try {
    const response = await fetch(`${base}models/${body.toLowerCase()}_crotch.json`, { cache: "no-store" });
    if (!response.ok) return;
    setCrotchKeys(body, (await response.json()) as FaceKeysFile);
  } catch {
    // No keys: the game's own opening.
  }
}

/** One mesh's moves per key ("Vulva_Open"...), a value per point in the model's space (as the Dresser's moves). */
export type KeyMoves = Map<string, Float32Array>;

/**
 * The keys that move any of a mesh's points: `bind`, its points in the model's space, and `bindMatrix`, the mesh's
 * (its own space to the model's), in which the key file's points and moves are. Points are found by where they sit
 * as built (a point split at a seam is found once per copy, and both move together). `seen`, one byte per rest point
 * of the file's object, is marked for each found.
 */
export function crotchMovesFor(bind: Float32Array, bindMatrix: Matrix4, entry: FaceKeyObject, seen?: Uint8Array): KeyMoves {
  const rest = floats(entry.rest);
  const find = pointFinder(rest);
  const e = bindMatrix.clone().invert().elements;
  const m = bindMatrix.elements;
  const count = bind.length / 3;
  const of = new Int32Array(count).fill(-1);
  let found = 0;
  for (let v = 0; v < count; v++) {
    const x = bind[v * 3], y = bind[v * 3 + 1], z = bind[v * 3 + 2];
    const i = find(
      e[0] * x + e[4] * y + e[8] * z + e[12],
      e[1] * x + e[5] * y + e[9] * z + e[13],
      e[2] * x + e[6] * y + e[10] * z + e[14],
    );
    if (i < 0) continue;
    of[v] = i;
    found++;
    if (seen) seen[i] = 1;
  }
  const out: KeyMoves = new Map();
  if (!found) return out;
  const restPoints = rest.length / 3;
  const moved = new Float32Array(restPoints * 3);
  for (const [name, key] of Object.entries(entry.keys)) {
    moved.fill(0);
    const points = ints(key.points);
    const deltas = floats(key.deltas);
    for (let k = 0; k < points.length; k++) moved.set(deltas.subarray(k * 3, k * 3 + 3), points[k] * 3);
    const moves = new Float32Array(count * 3);
    let any = false;
    for (let v = 0; v < count; v++) {
      const i = of[v];
      if (i < 0) continue;
      const x = moved[i * 3], y = moved[i * 3 + 1], z = moved[i * 3 + 2];
      if (x === 0 && y === 0 && z === 0) continue;
      // A move turns with the mesh into the model's space, without its shift.
      moves[v * 3] = m[0] * x + m[4] * y + m[8] * z;
      moves[v * 3 + 1] = m[1] * x + m[5] * y + m[9] * z;
      moves[v * 3 + 2] = m[2] * x + m[6] * y + m[10] * z;
      any = true;
    }
    if (any) out.set(name, moves);
  }
  return out;
}

/** Each key's weight for one part: Open from how open she is (0 to 2), the rest from what holds her. */
export function crotchWeights(part: CrotchPart, open: number, hold: CrotchHold): [string, number][] {
  return [
    [`${part}_Open`, open],
    [`${part}_Close`, hold.close],
    [`${part}_SpreadL`, hold.left],
    [`${part}_SpreadR`, hold.right],
  ];
}

/** Adds the keys' moves at their weights to a mesh's moves (`total`, in the model's space). */
export function addCrotchMoves(total: Float32Array, moves: KeyMoves | undefined, weights: [string, number][]): void {
  if (!moves) return;
  for (const [name, weight] of weights) {
    const move = weight ? moves.get(name) : undefined;
    if (!move) continue;
    for (let i = 0; i < total.length; i++) total[i] += move[i] * weight;
  }
}

/** A hold clamped to 0..1. */
export function clampHold(hold: Partial<CrotchHold> | undefined): CrotchHold {
  const c = (v: number | undefined) => Math.min(1, Math.max(0, v ?? 0));
  return { close: c(hold?.close), left: c(hold?.left), right: c(hold?.right) };
}
