/**
 * Fits an expression's numbers (face.ts EXPRESSIONS) to a shape the user made for it in Blender
 * (art/face_expressions.blend): the target's points (brows and mouth, as Blender has them) against her face as the game
 * moves it, searching the controls named in FP_KEYS from the expression's current values. Not a test. Prints the best
 * values and how far off they leave her, in millimetres, and writes them to <target>.fit.json.
 *
 * FP_TARGET: { expression, targets: [{ piece, point, kind: "brow"|"mouth", co: [x, y, z] }] }, piece and point
 * indexing headPieces() (head.ts), co in Blender's Z-up. Brows are matched across and up only: the game lays them on her
 * face wherever they go.
 *
 * Run (PowerShell, repo root): $env:FP_TARGET = "..."; $env:FP_KEYS = "brow,browOuter"; npx vitest run -c tools/facepreview/fit.vitest.config.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, startLook } from "../../src/game/appearance";
import { EXPRESSIONS, REST_FACE, type Expression, type FaceShape } from "../../src/game/face";
import { stripImages } from "../posepreview/raster";
import { headFrame, headPieces, NAME } from "./head";

interface Target {
  piece: number;
  point: number;
  kind: "brow" | "mouth";
  co: [number, number, number];
}

test("face preview: fit an expression to a Blender edit", async () => {
  const file = process.env.FP_TARGET!;
  const job: { expression: Expression; targets: Target[] } = JSON.parse(readFileSync(file, "utf8"));
  const keys = (process.env.FP_KEYS ?? "").split(",").filter(Boolean) as (keyof FaceShape)[];
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(join("public", "models", "female.glb"))), "");
  const root = gltf.scene.getObjectByName(NAME) ?? gltf.scene;
  const dresser = new Dresser(root, NAME);
  dresser.apply(startLook(NAME));
  const pieces = headPieces(gltf.scene);

  /** Mean squared distance (m²) from the target, the shape as the game makes it. */
  const error = (shape: FaceShape, byKind?: Record<string, number[]>): number => {
    dresser.setExpression(REST_FACE);
    dresser.setExpression(shape);
    const frame = headFrame(pieces);
    let sum = 0;
    for (const t of job.targets) {
      const co = frame[t.piece].co;
      const dx = co[t.point * 3] - t.co[0];
      const dy = co[t.point * 3 + 1] - t.co[1];
      const dz = co[t.point * 3 + 2] - t.co[2];
      const d2 = t.kind === "brow" ? dx * dx + dz * dz : dx * dx + dy * dy + dz * dz;
      sum += d2;
      byKind?.[t.kind].push(Math.sqrt(d2) * 1000);
    }
    return sum / job.targets.length;
  };
  const report = (shape: FaceShape) => {
    const byKind: Record<string, number[]> = { brow: [], mouth: [] };
    error(shape, byKind);
    return Object.fromEntries(
      Object.entries(byKind).map(([k, v]) => [k, { meanMm: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2), maxMm: +Math.max(...v).toFixed(2) }]),
    );
  };

  const start = { ...EXPRESSIONS[job.expression] };
  let best = { ...start };
  let bestErr = error(best);
  // Coordinate search, halving the step each round it can't improve.
  for (let step = 0.4; step >= 0.0125; ) {
    let improved = false;
    for (const key of keys) {
      for (const dir of [1, -1]) {
        const trial = { ...best, [key]: +(best[key] + dir * step).toFixed(4) };
        const e = error(trial);
        if (e < bestErr - 1e-12) {
          best = trial;
          bestErr = e;
          improved = true;
        }
      }
    }
    if (!improved) step /= 2;
  }
  const rounded = { ...best };
  for (const key of keys) rounded[key] = Math.round(best[key] * 20) / 20;
  const result = {
    expression: job.expression,
    before: Object.fromEntries(keys.map((k) => [k, start[k]])),
    after: Object.fromEntries(keys.map((k) => [k, rounded[k]])),
    offBefore: report(start),
    offAfter: report(rounded),
  };
  console.log(JSON.stringify(result, null, 1));
  writeFileSync(file.replace(/\.json$/, ".fit.json"), JSON.stringify(result, null, 1));
});
