/**
 * Every expression (face.ts EXPRESSIONS) put on her face as the game does it (Dresser.setExpression: her face's shape
 * keys from public/models/female_face.json, as morph targets), each written as an OBJ of her head for looking at in
 * Blender (tools/facepreview/show_in_blender.py lays them out in a row). Not a test. Writes to FP_OUT (default
 * tools/facepreview/out): <expression>.obj and index.json.
 *
 * Run (PowerShell, repo root): npx vitest run -c tools/facepreview/vitest.config.ts (FP_MODEL: another female.glb;
 * FP_FACE_KEYS: another face keys file)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, startLook } from "../../src/game/appearance";
import { EXPRESSIONS, EXPRESSIONS_LIST } from "../../src/game/face";
import { setFaceKeys, type FaceKeysFile } from "../../src/game/facekeys";
import { stripImages } from "../posepreview/raster";
import { headFrame, headObj, headPieces, NAME } from "./head";

test("face preview: every expression as an OBJ", async () => {
  const out = process.env.FP_OUT ?? join("tools", "facepreview", "out");
  mkdirSync(out, { recursive: true });
  const keys = process.env.FP_FACE_KEYS ?? join("public", "models", "female_face.json");
  setFaceKeys(NAME, JSON.parse(readFileSync(keys, "utf8")) as FaceKeysFile);
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(process.env.FP_MODEL ?? join("public", "models", "female.glb"))), "");
  const model = gltf.scene;
  const root = model.getObjectByName(NAME) ?? model;
  const dresser = new Dresser(root, NAME);
  dresser.apply(startLook(NAME));
  const pieces = headPieces(model);
  const frames: Record<string, ReturnType<typeof headFrame>> = {};
  for (const expression of EXPRESSIONS_LIST) {
    dresser.setExpression(EXPRESSIONS[expression]);
    writeFileSync(join(out, `${expression}.obj`), headObj(model));
    frames[expression] = headFrame(pieces);
  }
  // For shape keys (show_in_blender.py): the head's pieces once, then every expression's points and which pieces show.
  writeFileSync(join(out, "shapes.json"), JSON.stringify({ pieces: pieces.map((p) => p.piece), frames }));
  writeFileSync(join(out, "index.json"), JSON.stringify({ expressions: EXPRESSIONS_LIST, shapes: EXPRESSIONS }, null, 1));
});
