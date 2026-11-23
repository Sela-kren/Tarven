/**
 * The female walk and run as the game poses them, one cycle each in FRAMES pictures (default 8), seen from her
 * side (or VIEW=front / back / quarter), for checking the gait by eye. Writes raw RGBA to POSE_OUT (default
 * tools/posepreview/out/gait) with an index JSON (the floor line's row included); a script lays them out.
 * STYLE picks the walk style level (default the game's), TAG prefixes the file names.
 * Run: ONLY=tools/posepreview/gait.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Box3, Mesh, PerspectiveCamera, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Body, FEMALE_WALK_STYLE } from "../../src/game/player";
import { colourOf, draw, H, stripImages, W } from "./raster";

test("render the female walk and run", async () => {
  const name = "Female";
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out", "gait");
  mkdirSync(out, { recursive: true });
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), "female.glb"));
  const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
  const model = gltf.scene;
  model.traverse((o) => {
    if (o instanceof Mesh) o.visible = colourOf(o, name) !== null;
  });
  const body = new Body(model, name);
  body.setWalkStyle(Number(process.env.STYLE ?? FEMALE_WALK_STYLE));
  // GAIT="run.lean=0.3,walk.thighSwing=0.4" tries other numbers without editing the game.
  for (const pair of process.env.GAIT?.split(",") ?? []) {
    const [path, value] = pair.split("=");
    const [which, key] = path.split(".") as ["walk" | "run", string];
    body.gait = { ...body.gait, [which]: { ...body.gait[which], [key]: Number(value) } };
  }
  model.updateMatrixWorld(true);
  const standing = new Box3().setFromObject(model, true);
  const frames = Number(process.env.FRAMES ?? 8);
  const view = process.env.VIEW ?? "side";
  const tag = process.env.TAG ?? "";
  const top = standing.max.y * 1.08;
  const camera = new PerspectiveCamera(28, W / H, 0.05, 30);
  const distance = top / 2 / Math.tan((camera.fov * Math.PI) / 360);
  // She faces -Z: the side view looks at her right side, from +X.
  const dir = view === "front" ? new Vector3(0, 0, -1) : view === "back" ? new Vector3(0, 0, 1) : view === "quarter" ? new Vector3(0.7, 0, -0.7) : new Vector3(1, 0, 0);
  camera.position.copy(dir.multiplyScalar(distance)).setY(top / 2);
  camera.lookAt(0, top / 2, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const floor = new Vector3(0, 0, 0).project(camera);
  const floorRow = Math.round(((1 - floor.y) / 2) * H);
  const index: { gait: string; frame: number; file: string }[] = [];
  for (const [gait, running] of [["walk", 0], ["run", 1]] as const) {
    for (let i = 0; i < frames; i++) {
      const stride = (i / frames) * Math.PI * 2;
      body.advance(1 / 60);
      body.pose(stride, 1, 0, 0, running);
      model.updateMatrixWorld(true);
      const fileName = `${tag}${gait}_${view}_${i}.rgba`;
      writeFileSync(join(out, fileName), draw(model, name, camera));
      index.push({ gait, frame: i, file: fileName });
    }
  }
  writeFileSync(join(out, `${tag}index_${view}.json`), JSON.stringify({ w: W, h: H, floorRow, items: index }));
});
