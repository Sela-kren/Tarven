/**
 * Checks her face keys in the game against what made them: loads the model and its face keys file the way the game
 * does (facekeys.ts, Dresser), puts each expression on, and measures her face's points with the morph targets on
 * (as the GPU draws them) against the old face rig's for the same expression (facerig.ts). Right after a bake they
 * should agree to well under a millimetre; once keys are sculpted, this says how far each expression has moved from
 * the old rig, and whether any key's points weren't found on the model.
 *
 *   $env:FKC_KEYS="public/models/female_face.json"; npx vitest run -c tools/bridge/facekeyscheck.config.ts
 *
 * FKC_MODEL reads another GLB (default public/models/female.glb).
 */
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { Matrix3, Mesh, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, LOOK_OPTIONS, startLook } from "../../src/game/appearance";
import { EXPRESSIONS, EXPRESSIONS_LIST, REST_FACE } from "../../src/game/face";
import { setFaceKeys, type FaceKeysFile } from "../../src/game/facekeys";
import { EXPRESSION_CONTROLS, PART_CONTROLS, REST_CONTROLS, type FaceControls } from "../../src/game/facerig";
import { stripImages } from "../posepreview/raster";

test("face keys check", async () => {
  const keys = JSON.parse(readFileSync(process.env.FKC_KEYS ?? "public/models/female_face.json", "utf8")) as FaceKeysFile;
  setFaceKeys("Female", keys);
  const model = (await new GLTFLoader().parseAsync(stripImages(readFileSync(process.env.FKC_MODEL ?? "public/models/female.glb")), "")).scene;
  const root = model.getObjectByName("Female")!;
  const dresser = new Dresser(root, "Female");
  const look = startLook("Female");
  look.sliders = Object.fromEntries(LOOK_OPTIONS.Female.sliders.map((s) => [s.id, 0]));
  dresser.apply(look);
  const meshes: SkinnedMesh[] = [];
  root.traverse((o) => {
    if (o instanceof SkinnedMesh && o.morphTargetDictionary && Object.keys(o.morphTargetDictionary).length) meshes.push(o);
  });
  console.log(`morph targets on ${meshes.length} meshes: ${meshes.map((m) => `${m.name} ${Object.keys(m.morphTargetDictionary!).length}`).join(", ")}`);
  const v = new Vector3();
  const at = (mesh: Mesh) => {
    const pos = mesh.geometry.getAttribute("position");
    const out = new Float32Array(pos.count * 3);
    // Morphs on, no skinning: in the mesh's own space, as the old rig's moves are once taken out of bind space.
    for (let i = 0; i < pos.count; i++) {
      (mesh as SkinnedMesh).getVertexPosition(i, v);
      v.toArray(out, i * 3);
    }
    return out;
  };
  dresser.setExpression(REST_FACE);
  const rest = new Map(meshes.map((m) => [m, at(m)]));
  const geometric = (c: FaceControls): FaceControls => {
    // The old expression without what the morphs don't do: its look and pupil go through their own keys, which are
    // linear in them, so they're kept; only drawn things are left out.
    const out = { ...REST_CONTROLS };
    for (const k of [...PART_CONTROLS.brows, ...PART_CONTROLS.eyes, ...PART_CONTROLS.mouth, "lookX", "lookY", "pupil"] as const) out[k] = c[k];
    return out;
  };
  const lines: string[] = [];
  for (const e of EXPRESSIONS_LIST) {
    dresser.setExpression(EXPRESSIONS[e]);
    const morphed = new Map(meshes.map((m) => [m, at(m)]));
    const old = dresser.controlMoves(geometric(EXPRESSION_CONTROLS[e]));
    let worst = 0, sum = 0, n = 0;
    for (const m of meshes) {
      const r = rest.get(m)!, p = morphed.get(m)!;
      const move = old.get(m);
      const toLocal = new Matrix3().setFromMatrix4(m.bindMatrixInverse);
      for (let i = 0; i < r.length / 3; i++) {
        const want = move ? new Vector3(move[i * 3], move[i * 3 + 1], move[i * 3 + 2]).applyMatrix3(toLocal) : new Vector3();
        const got = new Vector3(p[i * 3] - r[i * 3], p[i * 3 + 1] - r[i * 3 + 1], p[i * 3 + 2] - r[i * 3 + 2]);
        if (want.lengthSq() === 0 && got.lengthSq() === 0) continue;
        const d = got.distanceTo(want) * 1000;
        worst = Math.max(worst, d);
        sum += d;
        n++;
      }
    }
    lines.push(`${e.padEnd(12)} ${n} points move, off by mean ${(sum / Math.max(n, 1)).toFixed(3)} mm, most ${worst.toFixed(3)} mm`);
  }
  console.log(lines.join("\n"));
}, 1800000);
