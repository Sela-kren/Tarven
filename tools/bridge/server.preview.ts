/**
 * The Blender bridge's game side: a small local HTTP server that shapes her with the game's own code (Dresser,
 * face.ts) over the model the game loads, for the Blender add-on's Game view (tools/blender/tarven_bridge). Blender
 * never works out a slider itself, so what it shows is what the game shows.
 *
 *   npm run bridge          (vitest runs this file and it serves until stopped; BRIDGE_PORT, default 8765)
 *
 * GET  /schema   the game's sliders (with ranges and steps), outfits, hairstyles, bust shapes, nipple types, the
 *                face's numbers over its shape keys (faceKeys: blink, lookX...), each expression's, and her start look
 * POST /shape    { look?, sliders?, outfit?, hairstyle?, bustShape?, expression?, face?, nude?, posed?, known? }
 *                (her face: the expression's shape keys as morph targets, from public/models/female_face.json, with
 *                `face`'s numbers over it)
 *                -> { meshes: [{ key, name, material, color, map, count, positions, indices? }], ms }
 *                positions are her points in the world, Blender's Z-up, Float32 little-endian base64; the indices
 *                (Uint32 base64) and uvs (Float32, Blender's V) come only for keys not in `known`, so the add-on
 *                builds each mesh once.
 * POST /rest     the same meshes as built, nothing applied (for mapping Game view edits back to the master)
 * POST /reload   re-reads public/models/female.glb and its face keys (after Send to game or Send face keys)
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { test } from "vitest";
import { Color, Material, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CLEAR_GAP, CUPS, Dresser, LOOK_OPTIONS, sliderTop, smoothTopGap, startLook, stopValue, wearOutfit, type Look } from "../../src/game/appearance";
import { EXPRESSIONS, EXPRESSIONS_LIST, FACE_NUMBERS, REST_FACE, type Expression, type FaceNumber, type FaceShape } from "../../src/game/face";
import { setFaceKeys, type FaceKeysFile } from "../../src/game/facekeys";
import { setCrotchKeys } from "../../src/game/crotchkeys";
import { Body } from "../../src/game/player";
import { softHeft } from "../../src/game/heft";
import { stripImages } from "../posepreview/raster";
import { mergeOutfits } from "../posepreview/glbmerge";
import { averageLinear } from "./png";

const NAME = "Female";
const PORT = Number(process.env.BRIDGE_PORT ?? 8765);
const MODEL = process.env.BRIDGE_MODEL ?? join("public", "models", "female.glb");
const FACE_KEYS = process.env.BRIDGE_FACE_KEYS ?? join("public", "models", "female_face.json");
const CROTCH_KEYS = process.env.BRIDGE_CROTCH_KEYS ?? join("public", "models", "female_crotch.json");

interface ShapeJob {
  look?: Look | null;
  sliders?: Record<string, number>;
  outfit?: string | null;
  hairstyle?: string | null;
  bustShape?: string | null;
  expression?: Expression | null;
  /** The face's numbers over the expression's keys (blink, lookX, lookY, pupil, blush...). */
  face?: Partial<Record<FaceNumber, number>> | null;
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
  // Her face's shape keys, as the game loads them (main.ts), before her Dresser takes them.
  setFaceKeys(NAME, existsSync(FACE_KEYS) ? (JSON.parse(readFileSync(FACE_KEYS, "utf8")) as FaceKeysFile) : null);
  setCrotchKeys(NAME, existsSync(CROTCH_KEYS) ? (JSON.parse(readFileSync(CROTCH_KEYS, "utf8")) as FaceKeysFile) : null);
  // A split model with its outfit files put back in (glb_split.py), pictures and all.
  const file = mergeOutfits(readFileSync(MODEL), dirname(MODEL));
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
    faceKeys: FACE_NUMBERS,
    expressions: Object.fromEntries(EXPRESSIONS_LIST.map((e) => [e, Object.fromEntries(FACE_NUMBERS.map((k) => [k, EXPRESSIONS[e][k]]))])),
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
