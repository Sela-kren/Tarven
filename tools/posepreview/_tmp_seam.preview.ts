// TEMPORARY (Claude): close-ups of each breast at several cup sizes, from MODELS. Delete after.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Mesh, PerspectiveCamera, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { colourOf, draw, stripImages, W, H } from "./raster";
import { Dresser, newLook, partOf } from "../../src/game/appearance";

test("seam", async () => {
  const out = process.env.POSE_OUT!;
  mkdirSync(out, { recursive: true });
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(join(process.env.MODELS!, "female.glb"))), "");
  const model = gltf.scene;
  const dresser = new Dresser(model.getObjectByName("Female") ?? model, "Female");
  const index: { pose: string; file: string }[] = [];
  for (const v of (process.env.VALUES ?? "0,0.5,1").split(",").map(Number)) {
    const look = newLook();
    look.sliders.bust = v;
    if (process.env.NOAPPLY !== "1") dresser.apply(look);
    model.traverse((o) => { if (o instanceof Mesh) o.visible = o.visible && colourOf(o, "Female") !== null && partOf(o, "Female") === "Body" && !(process.env.HIDE ?? "-").split(",").includes(((o as Mesh).material as { name: string }).name); });
    for (const [view, yaw, dx] of [["left", Math.PI, 0.09], ["right", Math.PI, -0.09], ["lefttop", Math.PI - 0.5, 0.09]] as const) {
      model.rotation.set(0, yaw, 0);
      model.updateMatrixWorld(true);
      const at = model.getObjectByName("Female_Bust")!.getWorldPosition(new Vector3());
      at.x += dx * Math.cos(yaw - Math.PI) * -1;
      const camera = new PerspectiveCamera(16, W / H, 0.05, 30);
      camera.position.set(at.x, at.y + 0.15, at.z + 1.1);
      camera.lookAt(at);
      camera.updateProjectionMatrix();
      const f = `c${v}_${view}.rgba`;
      writeFileSync(join(out, f), draw(model, "Female", camera));
      index.push({ pose: `c${v} ${view}`, file: f });
    }
  }
  writeFileSync(join(out, "index.json"), JSON.stringify({ w: W, h: H, items: index }));
});
