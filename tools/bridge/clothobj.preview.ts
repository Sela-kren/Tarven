// TEMPORARY (2026-11-21): her and her outfit as the game shapes them, as OBJ files, to render in Blender.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { test } from "vitest";
import { Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, startLook, stopValue, wearOutfit } from "../../src/game/appearance";
import { stripImages } from "../posepreview/raster";
function visible(o: Object3D): boolean { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; }
test("obj", async () => {
  const out = process.env.OUT!; mkdirSync(out, { recursive: true });
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(process.env.MODEL ?? "public/models/female.glb")), "");
  const model = gltf.scene; const dresser = new Dresser(model.getObjectByName("Female")!, "Female");
  for (const letter of (process.env.CUPS ?? "CFJO").split("")) {
    const look = wearOutfit("Female", startLook("Female"), process.env.OUTFIT ?? "tee");
    look.sliders = { ...look.sliders, bust: stopValue(CUPS, CUPS.labels.indexOf(letter)) };
    dresser.drapesOff = !!process.env.NODRAPE; dresser.setUndressed(false); dresser.apply(look); model.updateMatrixWorld(true);
    for (const kind of ["body", "cloth"]) {
      const lines: string[] = []; let base = 1; const v = new Vector3();
      model.traverse((o) => {
        if (!(o instanceof SkinnedMesh) || !visible(o)) return;
        const isBody = /^Female_Body(_\d+)?$/.test(o.name); const isCloth = o.name.startsWith("Female_Cloth");
        if (kind === "body" ? !isBody : !isCloth) return;
        o.skeleton.update(); const pos = o.geometry.getAttribute("position");
        for (let i = 0; i < pos.count; i++) { o.applyBoneTransform(i, v.fromBufferAttribute(pos, i)).applyMatrix4(o.matrixWorld); lines.push(`v ${v.x} ${v.y} ${v.z}`); }
        const idx = o.geometry.index!;
        for (let t = 0; t < idx.count; t += 3) lines.push(`f ${idx.getX(t) + base} ${idx.getX(t + 1) + base} ${idx.getX(t + 2) + base}`);
        base += pos.count;
      });
      writeFileSync(`${out}/${letter}_${kind}.obj`, lines.join("\n"));
    }
  }
});
