/**
 * Her upper body dressed as the game dresses her (Dresser, the look's outfit), at a few cup sizes, front and from the
 * side, to check her top over the sculpted, reshaped bust. Writes raw RGBA and an index JSON to POSE_OUT (default
 * tools/posepreview/out/dressed). CUPS picks the sizes (default C,F,J), OUTFIT_ID the look's outfit (default tee),
 * MODELS another folder of models, TAG a prefix for the files.
 * Run: ONLY=tools/posepreview/dressed.preview.ts OUTFIT=Tee npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Mesh, PerspectiveCamera } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, newLook, stopValue } from "../../src/game/appearance";
import { colourOf, draw, H, stripImages, W } from "./raster";

const NAME = "Female";

test("render her dressed at a few cup sizes", async () => {
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out", "dressed");
  mkdirSync(out, { recursive: true });
  const cups = (process.env.CUPS ?? "C,F,J").split(",");
  const tag = process.env.TAG ?? "";
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), "female.glb"));
  const index: { cup: string; view: string; file: string }[] = [];
  for (const cup of cups) {
    const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
    const model = gltf.scene;
    const root = model.getObjectByName(NAME) ?? model;
    const look = newLook();
    look.outfit = process.env.OUTFIT_ID ?? "tee";
    look.sliders.bust = stopValue(CUPS, CUPS.labels.indexOf(cup));
    new Dresser(root, NAME).apply(look);
    model.traverse((o) => {
      if (o instanceof Mesh) o.visible = o.visible && colourOf(o, NAME) !== null;
    });
    model.updateMatrixWorld(true);
    for (const view of ["front", "side"]) {
      const camera = new PerspectiveCamera(24, W / H, 0.05, 30);
      // She faces -Z.
      if (view === "front") camera.position.set(0, 1.15, -1.3);
      else camera.position.set(-1.3, 1.15, -0.05);
      camera.lookAt(0, 1.12, -0.05);
      camera.updateProjectionMatrix();
      const name = `${tag}${cup}_${view}.rgba`;
      writeFileSync(join(out, name), draw(model, NAME, camera));
      index.push({ cup, view, file: name });
    }
  }
  writeFileSync(join(out, `${tag}index.json`), JSON.stringify({ w: W, h: H, items: index }));
});
