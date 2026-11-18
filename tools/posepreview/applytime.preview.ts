import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, newLook, stopValue } from "../../src/game/appearance";
import { stripImages } from "./raster";
test("apply time", async () => {
  const file = readFileSync(join("public", "models", "female.glb"));
  const model = (await new GLTFLoader().parseAsync(stripImages(file), "")).scene;
  const d = new Dresser(model.getObjectByName("Female")!, "Female");
  const look = newLook(); look.outfit = "tee";
  const times: number[] = [];
  for (let i = 0; i < 12; i++) {
    look.sliders.bust = stopValue(CUPS, i % CUPS.labels.length);
    const t = performance.now(); d.apply(look); times.push(performance.now() - t);
  }
  writeFileSync(process.env.TIME_OUT ?? "t.txt", times.map((t) => t.toFixed(0)).join(" "));
}, 300000);
