/**
 * Bakes her face's shape keys from her old face rig (src/game/facerig.ts), as she's built: each key's recipe
 * (bakeRecipes: each expression's brows, eyes and mouth on their own, Blink, Look_*, Pupil_*) run through the rig, and
 * how far it moves each of her face's points written out in the face keys format (src/game/facekeys.ts). This is the
 * starting shape of every key: tools/blender/tarven_bridge/face_keys_build.py makes art/female_face_keys.blend's shape
 * keys from it, and the user sculpts from there.
 *
 *   $env:FACEBAKE_OUT="<file.json>"; npx vitest run -c tools/bridge/facebake.config.ts
 *
 * FACEBAKE_KEYS (comma separated) bakes only those keys; FACEBAKE_MODEL reads another GLB (default public/models/female.glb).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { Matrix3, Mesh, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, LOOK_OPTIONS, startLook } from "../../src/game/appearance";
import { FACE_KEY_NAMES } from "../../src/game/face";
import { blenderObjectOf, type FaceKeysFile } from "../../src/game/facekeys";
import { bakeRecipes, REST_CONTROLS } from "../../src/game/facerig";
import { stripImages } from "../posepreview/raster";

const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

/** Moves smaller than this (metres) are left out. */
const TINY = 1e-6;

test("face bake", async () => {
  const out = process.env.FACEBAKE_OUT ?? "ref/_bridge/face_baked.json";
  const model = (await new GLTFLoader().parseAsync(stripImages(readFileSync(process.env.FACEBAKE_MODEL ?? "public/models/female.glb")), "")).scene;
  const root = model.getObjectByName("Female")!;
  // Where every point sits in the GLB, before the Dresser touches them: the keys find their points by this.
  const built = new Map<Mesh, Float32Array>();
  root.traverse((o) => {
    if (o instanceof Mesh) built.set(o, Float32Array.from(o.geometry.getAttribute("position").array as ArrayLike<number>));
  });
  const dresser = new Dresser(root, "Female");
  // As built: every slider at 0, as the bridge's "As built".
  const look = startLook("Female");
  look.sliders = Object.fromEntries(LOOK_OPTIONS.Female.sliders.map((s) => [s.id, 0]));
  dresser.apply(look);
  const wanted = process.env.FACEBAKE_KEYS?.split(",").map((k) => k.trim()).filter(Boolean);
  const recipes = bakeRecipes(wanted?.length ? wanted : FACE_KEY_NAMES);
  // Per Blender object: its moved points (by where they sit), and per key each point's move, in the mesh's own space.
  const objects = new Map<string, { at: Map<string, number>; rest: number[]; keys: Map<string, Map<number, [number, number, number]>> }>();
  const d = new Vector3();
  for (const [name, recipe] of Object.entries(recipes)) {
    const moves = dresser.controlMoves({ ...REST_CONTROLS, ...recipe });
    let points = 0;
    for (const [mesh, move] of moves) {
      const original = built.get(mesh);
      if (!original) continue;
      const toLocal = new Matrix3().setFromMatrix4((mesh as SkinnedMesh).bindMatrix).invert();
      const object = blenderObjectOf(mesh);
      let entry = objects.get(object);
      if (!entry) objects.set(object, (entry = { at: new Map(), rest: [], keys: new Map() }));
      let key = entry.keys.get(name);
      if (!key) entry.keys.set(name, (key = new Map()));
      for (let v = 0; v < move.length / 3; v++) {
        d.set(move[v * 3], move[v * 3 + 1], move[v * 3 + 2]);
        if (d.lengthSq() < TINY * TINY) continue;
        d.applyMatrix3(toLocal);
        const x = original[v * 3], y = original[v * 3 + 1], z = original[v * 3 + 2];
        const spot = `${x},${y},${z}`;
        let i = entry.at.get(spot);
        if (i === undefined) {
          i = entry.rest.length / 3;
          entry.at.set(spot, i);
          entry.rest.push(x, y, z);
        }
        key.set(i, [d.x, d.y, d.z]);
        points++;
      }
    }
    console.log(`${name}: ${points} points`);
  }
  const file: FaceKeysFile = { version: 1, names: Object.keys(recipes), objects: {} };
  for (const [object, entry] of objects) {
    const keys: FaceKeysFile["objects"][string]["keys"] = {};
    for (const [name, moved] of entry.keys) {
      if (!moved.size) continue;
      const index = [...moved.keys()].sort((a, b) => a - b);
      keys[name] = { points: b64(Uint32Array.from(index)), deltas: b64(Float32Array.from(index.flatMap((i) => moved.get(i)!))) };
    }
    if (Object.keys(keys).length) file.objects[object] = { rest: b64(Float32Array.from(entry.rest)), keys };
  }
  writeFileSync(out, JSON.stringify(file));
  console.log(`face bake: ${Object.keys(recipes).length} keys, ${Object.keys(file.objects).length} objects -> ${out}`);
}, 1800000);
