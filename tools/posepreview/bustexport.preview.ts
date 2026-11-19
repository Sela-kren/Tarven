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
  /** Her skin's points as the game draws her at this cup, in the OBJ's order and axes; `bare` without the fixes. */
  const shape = async (value: number, bare: boolean) => {
    // A fresh model each time, so one size's reshaping never carries into the next.
    const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
    const model = gltf.scene;
    const root = model.getObjectByName(NAME) ?? model;
    if (bare) {
      model.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        for (const key of Object.keys(o.geometry.attributes)) if (key.startsWith("_bust_fix_")) o.geometry.deleteAttribute(key);
      });
    }
    const look = newLook();
    look.sliders.bust = value;
    new Dresser(root, NAME).apply(look);
    model.updateMatrixWorld(true);
    const meshes: { name: string; co: number[]; faces: number[] }[] = [];
    const v = new Vector3();
    model.traverse((o) => {
      if (!(o instanceof Mesh) || !isSkin(o)) return;
      const position = o.geometry.getAttribute("position");
      const co: number[] = [];
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        if (o instanceof SkinnedMesh) o.applyBoneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        // three.js is Y up and she faces -Z; in Blender, Z up, she faces -Y (the front view) with her left at +X.
        co.push(-v.x, v.z, v.y);
      }
      const index = o.geometry.index;
      const faces = index ? Array.from(index.array as ArrayLike<number>) : Array.from({ length: position.count }, (_, i) => i);
      meshes.push({ name: o.name, co, faces });
    });
    return meshes;
  };
  // How far the cup slider alone (none of the user's fixes) moves each point from the C cup, for bust_fixes.py to
  // tell the breasts' edits from her body's: measured with the fixes on, a cup's own fix counted as its growth.
  const bareC = (await shape(0, true)).flatMap((m) => m.co);
  const growth: Record<string, number[]> = {};
  for (const letter of letters) {
    const value = stopValue(CUPS, CUPS.labels.indexOf(letter));
    const meshes = await shape(value, false);
    const lines: string[] = [`# ${NAME} at cup ${letter} (slider ${value.toFixed(3)})`];
    let base = 1;
    for (const m of meshes) {
      lines.push(`o ${m.name}`);
      for (let i = 0; i < m.co.length; i += 3) lines.push(`v ${m.co[i].toFixed(6)} ${m.co[i + 1].toFixed(6)} ${m.co[i + 2].toFixed(6)}`);
      for (let i = 0; i < m.faces.length; i += 3) lines.push(`f ${m.faces[i] + base} ${m.faces[i + 1] + base} ${m.faces[i + 2] + base}`);
      base += m.co.length / 3;
    }
    const name = `bust_${letter}.obj`;
    writeFileSync(join(out, name), lines.join("\n"));
    index.push({ cup: letter, value, file: name });
    const bare = (await shape(value, true)).flatMap((m) => m.co);
    const grown: number[] = [];
    for (let i = 0; i < bare.length; i += 3) {
      grown.push(Math.round(Math.hypot(bare[i] - bareC[i], bare[i + 1] - bareC[i + 1], bare[i + 2] - bareC[i + 2]) * 1e6) / 1e6);
    }
    growth[letter] = grown;
  }
  writeFileSync(join(out, "growth.json"), JSON.stringify(growth));
  // Her body as built, none of the cup fixes on (the C cup, where the slider moves nothing): the surface the build
  // finds her points on when it applies a new fix (tools/blender/bust_refit.py uses it as the fix's ref_co). Measured
  // on bust_C.obj instead, which wears the C cup's own fix, points in the crease under her bust and in her armpit
  // found the skin across the crease and took its move.
  {
    const meshes = await shape(0, true);
    const lines: string[] = [`# ${NAME} as built, no cup fixes`];
    let base = 1;
    for (const m of meshes) {
      lines.push(`o ${m.name}`);
      for (let i = 0; i < m.co.length; i += 3) lines.push(`v ${m.co[i].toFixed(6)} ${m.co[i + 1].toFixed(6)} ${m.co[i + 2].toFixed(6)}`);
      for (let i = 0; i < m.faces.length; i += 3) lines.push(`f ${m.faces[i] + base} ${m.faces[i + 1] + base} ${m.faces[i + 2] + base}`);
      base += m.co.length / 3;
    }
    writeFileSync(join(out, "bust_bare.obj"), lines.join("\n"));
  }
  writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 1));
});
