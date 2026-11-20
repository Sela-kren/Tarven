/**
 * The Blender bridge's game side: a small local HTTP server that shapes her with the game's own code (Dresser,
 * face.ts) over the model the game loads, for the Blender add-on's Game view (tools/blender/tarven_bridge). Blender
 * never works out a slider itself, so what it shows is what the game shows.
 *
 *   npm run bridge          (vitest runs this file and it serves until stopped; BRIDGE_PORT, default 8765)
 *
 * GET  /schema   the game's sliders (with ranges and steps), outfits, hairstyles, bust shapes, nipple types, face
 *                keys, expressions and her start look
 * POST /shape    { look?, sliders?, outfit?, hairstyle?, bustShape?, expression?, face?, nude?, posed?, known? }
 *                -> { meshes: [{ key, name, material, color, map, count, positions, indices? }], ms }
 *                positions are her points in the world, Blender's Z-up, Float32 little-endian base64; the indices
 *                (Uint32 base64) and uvs (Float32, Blender's V) come only for keys not in `known`, so the add-on
 *                builds each mesh once.
 * POST /rest     the same meshes as built, nothing applied (for mapping Game view edits back to the master)
 * POST /reload   re-reads public/models/female.glb (after Send to game)
 */
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { test } from "vitest";
import { Color, Material, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CLEAR_GAP, CUPS, Dresser, LOOK_OPTIONS, sliderTop, smoothTopGap, startLook, stopValue, wearOutfit, type Look } from "../../src/game/appearance";
import { EXPRESSIONS, EXPRESSIONS_LIST, FACE_KEYS, REST_FACE, UNSIGNED, type Expression, type FaceShape } from "../../src/game/face";
import { Body } from "../../src/game/player";
import { softHeft } from "../../src/game/heft";
import { stripImages } from "../posepreview/raster";
import { averageLinear } from "./png";

const NAME = "Female";
const PORT = Number(process.env.BRIDGE_PORT ?? 8765);
const MODEL = process.env.BRIDGE_MODEL ?? join("public", "models", "female.glb");

interface ShapeJob {
  look?: Look | null;
  sliders?: Record<string, number>;
  outfit?: string | null;
  hairstyle?: string | null;
  bustShape?: string | null;
  expression?: Expression | null;
  face?: Partial<FaceShape> | null;
  nude?: boolean;
  posed?: boolean;
  known?: string[];
  /** Her clothes without the cloth drapes baked in Blender (what a new bake is measured against). */
  noDrape?: boolean;
}

interface Loaded {
  model: Object3D;
  root: Object3D;
  dresser: Dresser;
  /** Her meshes in a fixed order with a key each: name and material, numbered if they repeat; and the material
   * each was loaded with, to tell a look's recolour. */
  meshes: { key: string; mesh: Mesh; original: Material | undefined }[];
}

/** Each textured material's texture average (linear), by material name, read from the GLB's own pictures. */
function textureAverages(file: Buffer): Map<string, [number, number, number]> {
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
  const binStart = 20 + jsonLength + 8;
  const out = new Map<string, [number, number, number]>();
  for (const material of json.materials ?? []) {
    const index = material.pbrMetallicRoughness?.baseColorTexture?.index;
    const image = index === undefined ? undefined : json.images?.[json.textures?.[index]?.source];
    const view = image?.bufferView === undefined ? undefined : json.bufferViews[image.bufferView];
    if (!view) continue;
    const start = binStart + (view.byteOffset ?? 0);
    const average = averageLinear(new Uint8Array(file.subarray(start, start + view.byteLength)));
    if (average) out.set(material.name, average);
  }
  return out;
}

async function load(): Promise<Loaded> {
  const file = readFileSync(MODEL);
  const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
  const model = gltf.scene;
  const root = model.getObjectByName(NAME) ?? model;
  // The textures aren't loaded here: each textured material takes its texture's average into its colour, so what
  // the game works out from a material's average (a look's dyes and tones, sheer cloth) comes out as in the game.
  const averages = textureAverages(file);
  const done = new Set<Material>();
  model.traverse((o) => {
    const material = (o as Mesh).material as MeshStandardMaterial | undefined;
    const average = material && averages.get(material.name);
    if (material && average && !done.has(material)) {
      material.color.multiply(new Color(...average));
      done.add(material);
    }
  });
  const meshes: Loaded["meshes"] = [];
  const seen = new Map<string, number>();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const base = `${o.name}|${materialOf(o)?.name ?? ""}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    meshes.push({ key: n ? `${base}|${n}` : base, mesh: o, original: materialOf(o) });
  });
  return { model, root, dresser: new Dresser(root, NAME), meshes };
}

function materialOf(mesh: Mesh): MeshStandardMaterial | undefined {
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return m as MeshStandardMaterial | undefined;
}

function tintOf(now: Color, built: Color | undefined): [number, number, number] {
  const share = (a: number, b: number) => (b > 1e-4 ? a / b : a);
  return built ? [share(now.r, built.r), share(now.g, built.g), share(now.b, built.b)] : [now.r, now.g, now.b];
}

function visible(mesh: Object3D): boolean {
  for (let o: Object3D | null = mesh; o; o = o.parent) if (!o.visible) return false;
  return true;
}

const b64 = (array: Float32Array | Uint32Array) => Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString("base64");

/** Her shown meshes' points in the world (skinned, as the game draws them), turned into Blender's Z-up. */
function meshesOut(state: Loaded, known: Set<string>, all = false) {
  state.model.updateMatrixWorld(true);
  const v = new Vector3();
  const out = [];
  for (const { key, mesh, original } of state.meshes) {
    if (!all && !visible(mesh)) continue;
    const pos = mesh.geometry.getAttribute("position");
    const positions = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (mesh instanceof SkinnedMesh) mesh.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(mesh.matrixWorld);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = -v.z;
      positions[i * 3 + 2] = v.y;
    }
    const material = materialOf(mesh);
    const color = (material?.color as Color | undefined)?.clone() ?? new Color(1, 1, 1);
    // The Blender object it came from: a multi-material mesh loads as a group (the object's name) of one mesh per
    // material ("<name>_<n>").
    const parent = mesh.parent;
    const object = parent && !(parent instanceof Mesh) && mesh.name.startsWith(`${parent.name}_`) && parent.children.every((c) => c instanceof Mesh) ? parent.name : mesh.name;
    const entry: Record<string, unknown> = {
      key,
      name: mesh.name,
      object,
      material: material?.name ?? "",
      // The colour the game multiplies the texture by (linear), after the look's recolours.
      color: [color.r, color.g, color.b],
      // A look's recolour as a tint on the material as built (its average times this is what the game shows on
      // average), or null when the mesh wears its own.
      tint: material && material !== original ? tintOf(color, (original as MeshStandardMaterial | undefined)?.color) : null,
      count: pos.count,
      positions: b64(positions),
    };
    if (!known.has(key)) {
      const index = mesh.geometry.index;
      const indices = index ? Uint32Array.from(index.array as ArrayLike<number>) : Uint32Array.from({ length: pos.count }, (_, i) => i);
      entry.indices = b64(indices);
      const uv = mesh.geometry.getAttribute("uv");
      if (uv) {
        // glTF's V runs down; Blender's runs up.
        const uvs = new Float32Array(uv.count * 2);
        for (let i = 0; i < uv.count; i++) {
          uvs[i * 2] = uv.getX(i);
          uvs[i * 2 + 1] = 1 - uv.getY(i);
        }
        entry.uvs = b64(uvs);
      }
    }
    out.push(entry);
  }
  return out;
}

function lookFor(job: ShapeJob): Look {
  let look = job.look ?? startLook(NAME);
  if (job.outfit) look = wearOutfit(NAME, look, job.outfit);
  look = { ...look, sliders: { ...look.sliders, ...(job.sliders ?? {}) } };
  if (job.hairstyle) look = { ...look, hairstyle: job.hairstyle };
  if (job.bustShape) look = { ...look, bustShape: job.bustShape };
  return look;
}

function shape(state: Loaded, job: ShapeJob) {
  const started = performance.now();
  const look = lookFor(job);
  const { dresser } = state;
  dresser.setUndressed(false);
  dresser.drapesOff = !!job.noDrape;
  dresser.apply(look);
  if (job.nude) dresser.setUndressed(true);
  const face: FaceShape = { ...REST_FACE, ...(job.expression ? EXPRESSIONS[job.expression] : {}), ...(job.face ?? {}) };
  dresser.setExpression(face);
  if (job.posed) {
    // As the game stands her: the walk code standing still (ARM_HANG, her arms spread for her bust).
    const posing = new Body(state.model, NAME);
    state.model.updateMatrixWorld(true);
    posing.refreshRest(dresser.legSize(), dresser.armSpread(), dresser.posture(), softHeft(look.sliders));
    for (let f = 0; f < 30; f++) {
      posing.advance(1 / 60);
      posing.pose(0, 0, 0, 0, 0);
    }
  }
  const meshes = meshesOut(state, new Set(job.known ?? []));
  const bust = look.sliders.bust ?? 0;
  return {
    meshes, outfit: look.outfit ?? null, ms: Math.round(performance.now() - started),
    // How far the game keeps her clothes off her skin at this bust: fitted tops, and the rest.
    gaps: { top: smoothTopGap(bust), cloth: CLEAR_GAP },
  };
}

/** Face numbers that only colour or draw on her (no point moves), left out of a fit. */
const DRAWN_ONLY: readonly (keyof FaceShape)[] = ["blush", "crease", "wet", "tears", "heart", "sweat"];

interface FitJob extends ShapeJob {
  /** Where the user moved her face to on the game view: mesh key, point index, place (Blender Z-up). */
  targets: { key: string; index: number; co: [number, number, number]; weight?: number }[];
  /** The face numbers to search (all that move her face, if left out). */
  keys?: (keyof FaceShape)[];
}

/**
 * Finds her face numbers for the shape the user sculpted on the game view, over the game's own face code. A bounded,
 * damped least-squares fit (Gauss-Newton on finite differences), pulled gently towards the face she had on so it
 * picks the simplest numbers that make the shape, and kept in each control's range (UNSIGNED ones from 0). Her brows
 * are matched across and up only, as the game lays them on her face wherever they go.
 */
function fit(state: Loaded, job: FitJob) {
  const started = performance.now();
  shape(state, { ...job, face: job.face, expression: job.expression });
  const byKey = new Map(state.meshes.map((m) => [m.key, m.mesh]));
  const v = new Vector3();
  const targets = job.targets
    .map((t) => ({ ...t, mesh: byKey.get(t.key), brow: /\|T_hair_f/.test(t.key), w: Math.sqrt(t.weight ?? 1) }))
    .filter((t) => t.mesh);
  const size = targets.reduce((n, t) => n + (t.brow ? 2 : 3), 0);
  /** Where the face lands against the targets, metres, one entry per matched axis. */
  const residual = (face: FaceShape): Float64Array => {
    state.dresser.setExpression(face);
    state.model.updateMatrixWorld(true);
    const out = new Float64Array(size);
    let k = 0;
    for (const t of targets) {
      const mesh = t.mesh!;
      if (mesh instanceof SkinnedMesh) mesh.getVertexPosition(t.index, v);
      else v.fromBufferAttribute(mesh.geometry.getAttribute("position"), t.index);
      v.applyMatrix4(mesh.matrixWorld);
      out[k++] = (v.x - t.co[0]) * t.w;
      if (!t.brow) out[k++] = (-v.z - t.co[1]) * t.w;
      out[k++] = (v.y - t.co[2]) * t.w;
    }
    return out;
  };
  const report = (face: FaceShape) => {
    const r = residual(face);
    const off: number[] = [];
    let k = 0;
    for (const t of targets) {
      const n = t.brow ? 2 : 3;
      let d2 = 0;
      for (let j = 0; j < n; j++) d2 += r[k + j] ** 2;
      k += n;
      // How far off the points the user moved are (the anchors only hold the rest).
      if (t.w >= 1) off.push((Math.sqrt(d2) / t.w) * 1000);
    }
    return { meanMm: +(off.reduce((a, b) => a + b, 0) / Math.max(off.length, 1)).toFixed(2), maxMm: +Math.max(0, ...off).toFixed(2) };
  };
  const keys = job.keys?.length ? job.keys : FACE_KEYS.filter((k) => !DRAWN_ONLY.includes(k));
  const low = (key: keyof FaceShape) => (UNSIGNED.includes(key) ? 0 : -1.5);
  const HIGH = 1.5;
  const start: FaceShape = { ...REST_FACE, ...(job.expression ? EXPRESSIONS[job.expression] : {}), ...(job.face ?? {}) };
  // How strongly the numbers are held near where they started, against metres off squared per point.
  const hold = 2e-9 * Math.max(targets.length, 1);
  const cost = (face: FaceShape, r: Float64Array) => {
    let c = 0;
    for (const x of r) c += x * x;
    for (const key of keys) c += hold * (face[key] - start[key]) ** 2;
    return c;
  };
  let face = { ...start };
  let r = residual(face);
  let current = cost(face, r);
  let damping = 1e-6;
  const h = 0.02;
  for (let iteration = 0; iteration < 40; iteration++) {
    // The Jacobian, one column per control, by finite differences.
    const columns = keys.map((key) => {
      const step = face[key] + h <= HIGH ? h : -h;
      const moved = residual({ ...face, [key]: face[key] + step });
      const col = new Float64Array(size);
      for (let i = 0; i < size; i++) col[i] = (moved[i] - r[i]) / step;
      return col;
    });
    const n = keys.length;
    const A = Array.from({ length: n }, () => new Float64Array(n));
    const b = new Float64Array(n);
    for (let a = 0; a < n; a++) {
      for (let c = a; c < n; c++) {
        let sum = 0;
        for (let i = 0; i < size; i++) sum += columns[a][i] * columns[c][i];
        A[a][c] = A[c][a] = sum;
      }
      let sum = 0;
      for (let i = 0; i < size; i++) sum += columns[a][i] * r[i];
      b[a] = -sum - hold * (face[keys[a]] - start[keys[a]]);
    }
    let accepted = false;
    for (let tries = 0; tries < 8 && !accepted; tries++) {
      const M = A.map((row, i) => {
        const copy = Float64Array.from(row);
        copy[i] += hold + damping * (row[i] + 1e-9);
        return copy;
      });
      const delta = solve(M, Float64Array.from(b));
      const trial = { ...face };
      keys.forEach((key, i) => (trial[key] = Math.min(HIGH, Math.max(low(key), face[key] + delta[i]))));
      const rt = residual(trial);
      const ct = cost(trial, rt);
      if (ct < current) {
        face = trial;
        r = rt;
        current = ct;
        damping = Math.max(damping / 4, 1e-9);
        accepted = true;
      } else damping *= 8;
    }
    if (!accepted) break;
  }
  for (const key of keys) face[key] = Math.round(face[key] * 100) / 100;
  const result = { face, before: report(start), after: report(face), points: targets.length, ms: 0 };
  state.dresser.setExpression(face);
  result.ms = Math.round(performance.now() - started);
  return result;
}

/** Solves M x = y (small, symmetric), Gaussian elimination with partial pivoting. */
function solve(M: Float64Array[], y: Float64Array): Float64Array {
  const n = y.length;
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    [y[c], y[pivot]] = [y[pivot], y[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d;
      if (!f) continue;
      for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
      y[r] -= f * y[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let sum = y[r];
    for (let k = r + 1; k < n; k++) sum -= M[r][k] * x[k];
    x[r] = sum / (M[r][r] || 1e-12);
  }
  return x;
}

function schema() {
  const options = LOOK_OPTIONS[NAME];
  return {
    sliders: options.sliders.map((s) => ({
      id: s.id,
      label: s.label,
      tab: s.tab,
      group: s.group ?? null,
      min: s.stops ? stopValue(s.stops, 0) : -1,
      max: sliderTop(s),
      steps: s.stops ? s.stops.labels.map((label, i) => [label, stopValue(s.stops!, i)]) : null,
    })),
    cups: CUPS.labels.map((label, i) => [label, stopValue(CUPS, i)]),
    outfits: options.outfits.filter((o) => !o.guestOnly).map((o) => ({ id: o.id, label: o.label })),
    hairstyles: options.hairstyles.map((h) => ({ id: h.id, label: h.label })),
    bustShapes: options.bustShapes.map((b) => ({ id: b.id, label: b.label })),
    faceKeys: FACE_KEYS,
    expressions: Object.fromEntries(EXPRESSIONS_LIST.map((e) => [e, EXPRESSIONS[e]])),
    startLook: startLook(NAME),
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text) });
  res.end(text);
}

test(
  "bridge server",
  async () => {
    let state = await load();
    let posedLast = false;
    // One job at a time: the Dresser is shared.
    let queue: Promise<unknown> = Promise.resolve();
    const server = createServer((req, res) => {
      queue = queue.then(async () => {
        try {
          const body = req.method === "POST" ? await readBody(req) : "";
          const job = body ? (JSON.parse(body) as ShapeJob) : {};
          if (req.url === "/schema") return send(res, 200, schema());
          if (req.url === "/shape") {
            // Posing turns her bones, which apply() doesn't put back: start from a fresh load after a posed job.
            if (posedLast && !job.posed) state = await load();
            posedLast = !!job.posed;
            return send(res, 200, shape(state, job));
          }
          if (req.url === "/fit") return send(res, 200, fit(state, job as FitJob));
          if (req.url === "/rest") {
            const fresh = await load();
            return send(res, 200, { meshes: meshesOut(fresh, new Set(job.known ?? []), true) });
          }
          if (req.url === "/reload") {
            state = await load();
            return send(res, 200, { reloaded: MODEL });
          }
          if (req.url === "/ping") return send(res, 200, { ok: true, model: MODEL });
          send(res, 404, { error: `no ${req.url}` });
        } catch (error) {
          send(res, 500, { error: String((error as Error)?.stack ?? error) });
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
    console.log(`bridge: http://127.0.0.1:${PORT} serving ${MODEL}`);
    // Serve until stopped (Ctrl+C, or the add-on's Stop).
    await new Promise<void>((resolve) => server.on("close", resolve));
  },
  2 ** 31 - 1,
);
