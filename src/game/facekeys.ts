/**
 * Her face's shape keys, as the game plays them: morph targets on her face's meshes. They're sculpted in Blender
 * (art/female_face_keys.blend: "Brow_angry", "Eye_tired", "Mouth_panting", "Blink"...; see face.ts FACE_KEY_NAMES) and
 * written out by tools/blender/tarven_bridge/face_keys_out.py to public/models/female_face.json, next to her model.
 *
 * The file holds, for each Blender object of her face, only the points the keys move: where each sits at rest (in the
 * object's own space, turned Y-up as the GLB has it) and, per key, how far each of them moves. The game finds those
 * points on the GLB's meshes by where they sit (a point split at a seam in the GLB is found once per copy, and both move
 * together), so the file doesn't depend on the order the exporter wrote the GLB's points in.
 */
import { BufferAttribute, type Mesh } from "three";

/** How many rest points a key object has. */
export function restCount(entry: FaceKeyObject): number {
  return floats(entry.rest).length / 3;
}

/** One Blender object's keys: its moved points at rest (x, y, z each) and, per key, which of them move and how far. */
export interface FaceKeyObject {
  rest: string;
  keys: Record<string, { points: string; deltas: string }>;
}
export interface FaceKeysFile {
  version: 1;
  /** Every key the file is for, moving anything or not yet (a key not sculpted yet moves nothing). */
  names?: string[];
  objects: Record<string, FaceKeyObject>;
}

/** The loaded keys, by body ("Female"); null until loaded, or when there's no file. */
const loaded = new Map<string, FaceKeysFile>();

export function setFaceKeys(body: string, file: FaceKeysFile | null): void {
  if (file) loaded.set(body, file);
  else loaded.delete(body);
}

export function faceKeysOf(body: string): FaceKeysFile | null {
  return loaded.get(body) ?? null;
}

/** Fetches a body's face keys (models/<body>_face.json); the game runs without them, her face then still. */
export async function loadFaceKeys(base: string, body: string, file = body.toLowerCase()): Promise<void> {
  try {
    const response = await fetch(`${base}models/${file}_face.json`, { cache: "no-store" });
    if (!response.ok) return;
    setFaceKeys(body, (await response.json()) as FaceKeysFile);
  } catch {
    // No keys: her face stays at rest.
  }
}

function bytes(text: string): Uint8Array {
  if (typeof atob === "function") {
    const raw = atob(text);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  // Node (the bridge server, tests).
  const g = globalThis as unknown as { Buffer: { from(s: string, e: string): Uint8Array } };
  return Uint8Array.from(g.Buffer.from(text, "base64"));
}
const floats = (text: string) => new Float32Array(bytes(text).buffer);
const ints = (text: string) => new Uint32Array(bytes(text).buffer);

/**
 * How near (metres) a GLB point must sit to a key file's point to be it: the exporter's sums move points by about
 * 1e-7 m from where Blender has them, so they're looked up in a grid of cells this size and the ones round it.
 */
const NEAR = 2e-6;
const CELL = 1e-5;

/** The key file's points filed by grid cell, to find the one at a spot (within NEAR), or -1. */
function pointFinder(rest: Float32Array): (x: number, y: number, z: number) => number {
  const cells = new Map<string, number[]>();
  const cell = (x: number, y: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  for (let i = 0; i < rest.length / 3; i++) {
    const at = cell(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
    const list = cells.get(at);
    if (list) list.push(i);
    else cells.set(at, [i]);
  }
  return (x, y, z) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
    let best = -1;
    let bestD = NEAR * NEAR;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const i of cells.get(`${cx + a},${cy + b},${cz + c}`) ?? []) {
        const d = (rest[i * 3] - x) ** 2 + (rest[i * 3 + 1] - y) ** 2 + (rest[i * 3 + 2] - z) ** 2;
        if (d <= bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return best;
  };
}

/** The Blender object a GLB mesh came from: a multi-material object loads as a group of one mesh per material. */
export function blenderObjectOf(mesh: Mesh): string {
  const parent = mesh.parent;
  const grouped = parent && !(parent as Mesh).isMesh && mesh.name.startsWith(`${parent.name}_`);
  return grouped ? parent.name : mesh.name;
}

/**
 * Gives a mesh the keys that move any of its points, as morph targets (relative, in the mesh's own space), each named
 * for its key; the mesh's morphTargetDictionary then finds them. Returns how many keys it took. `seen`, one byte per
 * rest point of the object, is marked for each point found, so the caller can tell after all its meshes whether some
 * weren't found anywhere (the model changed since the keys were made).
 */
export function attachFaceKeys(mesh: Mesh, entry: FaceKeyObject, only?: ReadonlySet<string>, seen?: Uint8Array): number {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const rest = floats(entry.rest);
  const restPoints = rest.length / 3;
  const find = pointFinder(rest);
  // Which rest point each of the mesh's points is, or -1.
  const of = new Int32Array(position.count).fill(-1);
  let found = 0;
  for (let v = 0; v < position.count; v++) {
    const i = find(position.getX(v), position.getY(v), position.getZ(v));
    if (i >= 0) {
      of[v] = i;
      found++;
      if (seen) seen[i] = 1;
    }
  }
  if (!found) return 0;
  const targets: BufferAttribute[] = [];
  const moved = new Float32Array(restPoints * 3);
  for (const [name, key] of Object.entries(entry.keys)) {
    if (only && !only.has(name)) continue;
    moved.fill(0);
    const points = ints(key.points);
    const deltas = floats(key.deltas);
    for (let k = 0; k < points.length; k++) moved.set(deltas.subarray(k * 3, k * 3 + 3), points[k] * 3);
    const array = new Float32Array(position.count * 3);
    let any = false;
    for (let v = 0; v < position.count; v++) {
      const i = of[v];
      if (i < 0) continue;
      const x = moved[i * 3], y = moved[i * 3 + 1], z = moved[i * 3 + 2];
      if (x === 0 && y === 0 && z === 0) continue;
      array[v * 3] = x;
      array[v * 3 + 1] = y;
      array[v * 3 + 2] = z;
      any = true;
    }
    if (!any) continue;
    const target = new BufferAttribute(array, 3);
    target.name = name;
    targets.push(target);
  }
  if (!targets.length) return 0;
  geometry.morphAttributes.position = targets;
  geometry.morphTargetsRelative = true;
  mesh.updateMorphTargets();
  return targets.length;
}

/** Sets a mesh's face key weights in place (the outline shares the array): the named ones, every other at 0. */
export function setFaceKeyWeights(mesh: Mesh, weights: ReadonlyMap<string, number>): void {
  const names = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;
  if (!names || !influences) return;
  for (const [name, i] of Object.entries(names)) influences[i] = weights.get(name) ?? 0;
}
