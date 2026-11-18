/**
 * Her body as the game shapes it at a row of cup sizes, written as OBJ files for sculpting fixes on in Blender
 * (tools/blender/bust_review.py lays them out). Each file is her body mesh (and the nipple discs) at rest, posed
 * by the reshaped skeleton exactly as the game draws it, vertex for vertex in the model's own order, so a
 * sculpted copy can be compared back point by point. CUPS picks the letters (default A,C,F,J,M,Q,U,Z); POSE_OUT
 * sets the folder (default art/bust_review).
 * Run: ONLY=tools/posepreview/bustexport.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, LOOK_OPTIONS, newLook, stopValue } from "../../src/game/appearance";
import { stripImages } from "./raster";

const NAME = "Female";

/** True for her body mesh, as the look shows it: not her clothes, hair, or jewellery (the nipple rings). */
function isSkin(mesh: Object3D): boolean {
  if (/jewel/i.test(mesh.name)) return false;
  for (let o: Object3D | null = mesh; o; o = o.parent) if (o.name === `${NAME}_Body`) return true;
  return false;
}

test("export her body at each cup size", async () => {
  const out = process.env.POSE_OUT ?? join("art", "bust_review");
  mkdirSync(out, { recursive: true });
  const letters = (process.env.CUPS ?? "A,C,F,J,M,Q,U,Z").split(",");
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), "female.glb"));
  // TURN tries another outward turn on the Cup size slider (BoneTerm.turn, metres at Q) without editing the game.
  if (process.env.TURN) {
    const cupTerm = LOOK_OPTIONS.Female.sliders.find((s) => s.id === "bust")!.terms[0] as { turn?: number };
    cupTerm.turn = Number(process.env.TURN);
  }
  const index: { cup: string; value: number; file: string }[] = [];
  for (const letter of letters) {
    // A fresh model each time, so one size's reshaping never carries into the next.
    const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
    const model = gltf.scene;
    const root = model.getObjectByName(NAME) ?? model;
    const value = stopValue(CUPS, CUPS.labels.indexOf(letter));
    const look = newLook();
    look.sliders.bust = value;
    new Dresser(root, NAME).apply(look);
    model.updateMatrixWorld(true);
    const lines: string[] = [`# ${NAME} at cup ${letter} (slider ${value.toFixed(3)})`];
    let base = 1;
    const v = new Vector3();
    model.traverse((o) => {
      if (!(o instanceof Mesh) || !isSkin(o)) return;
      const position = o.geometry.getAttribute("position");
      lines.push(`o ${o.name}`);
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        if (o instanceof SkinnedMesh) o.applyBoneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        // three.js is Y up and she faces -Z; in Blender, Z up, she faces -Y (the front view) with her left at +X.
        lines.push(`v ${(-v.x).toFixed(6)} ${v.z.toFixed(6)} ${v.y.toFixed(6)}`);
      }
      const faces = o.geometry.index;
      const count = faces ? faces.count : position.count;
      for (let i = 0; i < count; i += 3) {
        const a = (faces ? faces.getX(i) : i) + base;
        const b = (faces ? faces.getX(i + 1) : i + 1) + base;
        const c = (faces ? faces.getX(i + 2) : i + 2) + base;
        lines.push(`f ${a} ${b} ${c}`);
      }
      base += position.count;
    });
    const name = `bust_${letter}.obj`;
    writeFileSync(join(out, name), lines.join("\n"));
    index.push({ cup: letter, value, file: name });
  }
  writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 1));
});
