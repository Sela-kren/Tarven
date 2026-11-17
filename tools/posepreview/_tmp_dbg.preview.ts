// TEMPORARY (Claude): which body part moves unevenly left vs right. Delete after.
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Material, SkinnedMesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { stripImages } from "./raster";
import { Dresser, newLook, partOf } from "../../src/game/appearance";
test("asym", async () => {
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(join(process.env.MODELS!, "female.glb"))), "");
  const model = gltf.scene;
  const meshes: SkinnedMesh[] = [];
  model.traverse((o) => { if (o instanceof SkinnedMesh && partOf(o, "Female") === "Body") meshes.push(o); });
  const binds = meshes.map((m) => (m.geometry.getAttribute("position").array as Float32Array).slice());
  const dresser = new Dresser(model.getObjectByName("Female") ?? model, "Female");
  const look = newLook(); look.sliders.bust = Number(process.env.CUP ?? 0.6); dresser.apply(look);
  meshes.forEach((m, i) => {
    const b = binds[i];
    const now = m.geometry.getAttribute("position").array as Float32Array;
    const n = b.length / 3;
    const key = (x: number, y: number, z: number) => `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;
    const at = new Map<string, number>();
    for (let v = 0; v < n; v++) at.set(key(b[v * 3], b[v * 3 + 1], b[v * 3 + 2]), v);
    let worst = 0, where = "";
    for (let v = 0; v < n; v++) {
      if (b[v * 3] <= 0.005) continue;
      const u = at.get(key(-b[v * 3], b[v * 3 + 1], b[v * 3 + 2]));
      if (u === undefined) continue;
      const dx = (now[v * 3] - b[v * 3]) + (now[u * 3] - b[u * 3]);
      const dy = (now[v * 3 + 1] - b[v * 3 + 1]) - (now[u * 3 + 1] - b[u * 3 + 1]);
      const dz = (now[v * 3 + 2] - b[v * 3 + 2]) - (now[u * 3 + 2] - b[u * 3 + 2]);
      const d = Math.hypot(dx, dy, dz);
      if (d > worst) { worst = d; where = `at ${b[v * 3].toFixed(3)},${b[v * 3 + 1].toFixed(3)},${b[v * 3 + 2].toFixed(3)} +x move ${(now[v*3]-b[v*3]).toFixed(3)},${(now[v*3+1]-b[v*3+1]).toFixed(3)},${(now[v*3+2]-b[v*3+2]).toFixed(3)} -x move ${(now[u*3]-b[u*3]).toFixed(3)},${(now[u*3+1]-b[u*3+1]).toFixed(3)},${(now[u*3+2]-b[u*3+2]).toFixed(3)}`; }
    }
    appendFileSync(process.env.DBG_OUT!, `${(m.material as Material).name} n=${n} worst=${worst.toFixed(4)} ${where}\n`);
  });
});
