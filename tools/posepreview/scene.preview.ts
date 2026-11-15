/**
 * Draws the after-hours scenes (src/game/sexpose.ts) on the real models, her and a man together, off screen, the
 * way render.preview.ts does the fight poses. SCENES picks which (comma separated, default all); DRESSED "1" leaves
 * her clothes on. YAW_ADD turns every camera further round, to see a scene from another side. ALONE "1" leaves
 * the join spots (SCENE_JOINS) empty; otherwise every one is filled.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Box3, Mesh, PerspectiveCamera, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { poseBones } from "../../src/game/battlepose";
import { Dresser, newLook } from "../../src/game/appearance";
import { placeBody, SCENE_JOINS, SCENE_POSE_LIST, SCENE_POSES, sceneFraming, type Posed, type ScenePoseName } from "../../src/game/sexpose";
import { makeTable } from "../../src/game/scenetable";
import { colourOf, drawAll, H, stripImages, W } from "./raster";

async function load(file: string, name: "Female" | "Male", nude: boolean): Promise<Posed> {
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(join("public", "models", file))), "");
  const model = gltf.scene;
  const root = model.getObjectByName(name) ?? model;
  const dresser = new Dresser(root, name);
  dresser.apply(newLook());
  if (nude) dresser.setDressing("nude");
  if (name === "Male") dresser.setErection(1);
  model.traverse((o) => {
    if (o instanceof Mesh) o.visible = o.visible && colourOf(o, name) !== null;
  });
  const bones = poseBones(model, name);
  const hipsBaseY = bones.hips?.position.y ?? 0;
  return {
    model,
    bones,
    female: name === "Female",
    hipsBaseY,
    hipsBaseZ: bones.hips?.position.z ?? 0,
    legLength: hipsBaseY + (bones.thighL?.position.y ?? 0),
    scale: 1,
  };
}

test("render the after-hours scenes", async () => {
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out");
  mkdirSync(out, { recursive: true });
  const her = await load("female.glb", "Female", process.env.DRESSED !== "1");
  const him = await load("male.glb", "Male", true);
  const others = [await load("male.glb", "Male", true), await load("male.glb", "Male", true)];
  const names = (process.env.SCENES ? process.env.SCENES.split(",") : SCENE_POSE_LIST) as ScenePoseName[];
  const index: { pose: string; file: string }[] = [];
  for (const name of names) {
    const scene = SCENE_POSES[name];
    const joins = process.env.ALONE === "1" ? [] : (SCENE_JOINS[name] ?? []).slice(0, others.length);
    let herBody = scene.her.body;
    for (const spot of joins) herBody = { ...herBody, ...spot.reach };
    placeBody(her, herBody, scene.her.place);
    const items: { model: Object3D; name: string }[] = [{ model: her.model, name: "Female" }];
    if (scene.them) {
      placeBody(him, scene.them.body, scene.them.place);
      items.push({ model: him.model, name: "Male" });
    }
    joins.forEach((spot, i) => {
      placeBody(others[i], spot.body, spot.place);
      items.push({ model: others[i].model, name: "Male" });
    });
    // The table under her, if the scene has one: in the picture, and framed with them.
    if (scene.table) items.push({ model: makeTable(scene.table), name: "Table" });
    const box = new Box3();
    for (const { model } of items) {
      model.updateMatrixWorld(true);
      box.union(new Box3().setFromObject(model, true));
    }
    const camera = new PerspectiveCamera(28, W / H, 0.05, 30);
    const view = { ...scene.view, yaw: scene.view.yaw + Number(process.env.YAW_ADD ?? 0) };
    const frame = sceneFraming(box, view, camera.fov, W / H);
    camera.position.copy(frame.position);
    camera.lookAt(frame.target);
    camera.updateProjectionMatrix();
    const file = `scene_${name}.rgba`;
    writeFileSync(join(out, file), drawAll(items, camera));
    index.push({ pose: name, file });
  }
  writeFileSync(join(out, "index_scenes.json"), JSON.stringify({ w: W, h: H, items: index }));
});
