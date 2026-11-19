/**
 * Scratch: her body and T-shirt as the game shapes them at a cup (CUPS list), as OBJ, Blender axes.
 * Run: ONLY=tools/posepreview/teeexport.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, HANG, startLook, stopValue } from "../../src/game/appearance";
import { stripImages } from "./raster";

const NAME = "Female";

test("export her tee at cups", async () => {
  const out = process.env.POSE_OUT ?? ".";
  mkdirSync(out, { recursive: true });
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), "female.glb"));
  if (process.env.HANG) Object.assign(HANG, JSON.parse(process.env.HANG));
  for (const letter of (process.env.CUPS ?? "C,J").split(",")) {
    const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
    const model = gltf.scene;
    const root = model.getObjectByName(NAME) ?? model;
    const look = startLook(NAME);
    look.sliders.bust = stopValue(CUPS, CUPS.labels.indexOf(letter));
    new Dresser(root, NAME).apply(look);
    model.updateMatrixWorld(true);
    const lines: string[] = [];
    let base = 1;
    const v = new Vector3();
    model.traverse((o: Object3D) => {
      if (!(o instanceof Mesh) || !o.visible) return;
      let shown = true;
      for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) shown = false;
      if (!shown || /jewel|hair|brow|lash|eye/i.test(o.name)) return;
      const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => m.name as string);
      const isBody = /_Body/.test(o.name) || mats.some((m) => /^T_skin/.test(m));
      const isTee = mats.some((m) => /^T_tee/.test(m));
      if (!isBody && !isTee) return;
      const position = o.geometry.getAttribute("position");
      lines.push(`o ${o.name}`);
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        if (o instanceof SkinnedMesh) o.applyBoneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        lines.push(`v ${(-v.x).toFixed(5)} ${v.z.toFixed(5)} ${v.y.toFixed(5)}`);
      }
      const index = o.geometry.index!;
      const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: index.count, materialIndex: 0 }];
      for (const g of groups) {
        const mat = mats[g.materialIndex ?? 0] ?? mats[0];
        if (isTee && !isBody && !/^T_tee/.test(mat)) continue;
        lines.push(`usemtl ${mat}`);
        for (let t = g.start; t < g.start + g.count; t += 3) {
          lines.push(`f ${index.getX(t) + base} ${index.getX(t + 1) + base} ${index.getX(t + 2) + base}`);
        }
      }
      base += position.count;
    });
    writeFileSync(join(out, `tee_${letter}.obj`), lines.join("\n"));
  }
});
