/**
 * Bakes the starting shape of her vulva's and anus's Open keys from the game's own opening (Dresser.setOpening, as the
 * game opened them before they had keys): how far fully open (1) moves each of their points from closed (0), as she's
 * built and bare, written out in the face keys format (src/game/facekeys.ts). tools/blender/tarven_bridge/
 * crotch_keys_build.py starts art/female_crotch_keys.blend's Vulva_Open and Anus_Open from it, and the user sculpts
 * from there.
 *
 *   $env:CROTCHBAKE_OUT="<file.json>"; npx vitest run -c tools/bridge/crotchbake.config.ts
 *
 * CROTCHBAKE_MODEL reads another GLB (default public/models/female.glb).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, LOOK_OPTIONS, startLook } from "../../src/game/appearance";
import { blenderObjectOf, type FaceKeysFile } from "../../src/game/facekeys";
import { unpackModel } from "../../src/game/unpack";
import { stripImages } from "../posepreview/raster";

const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

/** Moves smaller than this (metres) are left out. */
const TINY = 1e-6;

test("crotch bake", async () => {
  const out = process.env.CROTCHBAKE_OUT ?? "ref/_bridge/crotch_baked.json";
  const model = (await new GLTFLoader().parseAsync(stripImages(readFileSync(process.env.CROTCHBAKE_MODEL ?? "public/models/female.glb")), "")).scene;
  unpackModel(model);
  const root = model.getObjectByName("Female")!;
  // Where every point sits in the GLB, before the Dresser touches them: the keys find their points by this.
  const built = new Map<Mesh, Float32Array>();
  root.traverse((o) => {
    if (o instanceof Mesh) built.set(o, Float32Array.from(o.geometry.getAttribute("position").array as ArrayLike<number>));
  });
  const dresser = new Dresser(root, "Female");
  // As built (every slider at 0), bare, so her vulva and anus show and open.
  const look = startLook("Female");
  look.sliders = Object.fromEntries(LOOK_OPTIONS.Female.sliders.map((s) => [s.id, 0]));
  dresser.apply(look);
  dresser.setDressing("nude");
  const meshes = [...built.keys()];
  const snap = () => new Map(meshes.map((m) => [m, Float32Array.from(m.geometry.getAttribute("position").array as ArrayLike<number>)]));
  dresser.setOpening(0, 0);
  const closed = snap();
  const recipes: Record<string, [number, number]> = { Vulva_Open: [1, 0], Anus_Open: [0, 1] };
  const objects = new Map<string, { at: Map<string, number>; rest: number[]; keys: Map<string, Map<number, number[]>> }>();
  for (const [name, [vulva, anus]] of Object.entries(recipes)) {
    dresser.setOpening(vulva, anus);
    const open = snap();
    dresser.setOpening(0, 0);
    let points = 0;
    for (const mesh of meshes) {
      const a = closed.get(mesh)!, b = open.get(mesh)!, original = built.get(mesh)!;
      const object = blenderObjectOf(mesh);
      for (let v = 0; v < a.length / 3; v++) {
        const d = [b[v * 3] - a[v * 3], b[v * 3 + 1] - a[v * 3 + 1], b[v * 3 + 2] - a[v * 3 + 2]];
        if (Math.hypot(d[0], d[1], d[2]) < TINY) continue;
        let entry = objects.get(object);
        if (!entry) objects.set(object, (entry = { at: new Map(), rest: [], keys: new Map() }));
        let key = entry.keys.get(name);
        if (!key) entry.keys.set(name, (key = new Map()));
        const x = original[v * 3], y = original[v * 3 + 1], z = original[v * 3 + 2];
        const spot = `${x},${y},${z}`;
        let i = entry.at.get(spot);
        if (i === undefined) {
          i = entry.rest.length / 3;
          entry.at.set(spot, i);
          entry.rest.push(x, y, z);
        }
        key.set(i, d);
        points++;
      }
    }
    console.log(`${name}: ${points} points`);
  }
  const file: FaceKeysFile = { version: 1, names: Object.keys(recipes), objects: {} };
  for (const [object, entry] of objects) {
    const keys: FaceKeysFile["objects"][string]["keys"] = {};
    for (const [name, moved] of entry.keys) {
      const index = [...moved.keys()].sort((p, q) => p - q);
      keys[name] = { points: b64(Uint32Array.from(index)), deltas: b64(Float32Array.from(index.flatMap((i) => moved.get(i)!))) };
    }
    file.objects[object] = { rest: b64(Float32Array.from(entry.rest)), keys };
  }
  writeFileSync(out, JSON.stringify(file));
  console.log(`crotch bake: ${Object.keys(file.objects).join(", ")} -> ${out}`);
}, 1800000);
