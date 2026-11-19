/**
 * The ref compare's game side (see compare.py, which runs this): her body as the game shapes and dresses her, drawn
 * orthographic from one view so a reference picture lines up with it, and optionally written as OBJ (same world, same
 * camera) for compare.py's Blender render. Not a test. Reads the job from RC_JOB (a JSON file compare.py writes):
 *
 *   { "out": dir, "view": "front|back|left|right|quarter|quarter_r",
 *     "frame": null (her whole body) | { "cy": metres, "height": metres, "cx"?: metres },
 *     "look": a Look (appearance.ts) | null (as the player starts), "posed": false, "obj": true,
 *     "colours": "game|flat" }
 *
 * Picture size comes from PREVIEW_W / PREVIEW_H (raster.ts). Writes render.rgba, render.json and, with obj, model.obj.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Box3, Color, Mesh, MeshStandardMaterial, Object3D, OrthographicCamera, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, startLook, wearOutfit, type Look } from "../../src/game/appearance";
import { Body } from "../../src/game/player";
import { softHeft } from "../../src/game/heft";
import { colourOf, draw, H, stripImages, W } from "../posepreview/raster";

const NAME = "Female";

interface Job {
  out: string;
  view: string;
  frame: { cy: number; height: number; cx?: number } | null;
  look: Look | null;
  /** Put her in this outfit as the game does (its colours and underwear too), over the look. */
  outfit?: string | null;
  /** Slider values put over the look's. */
  sliders?: Record<string, number>;
  posed?: boolean;
  obj?: boolean;
  /** Also write sections.json: her body and clothes cut across every SECTION_STEP metres up her. */
  sections?: boolean;
  colours?: "game" | "flat";
  /** Undressed (setUndressed): bare but for her shoes. */
  nude?: boolean;
  /** Another female.glb to load instead of public/models/female.glb, e.g. a build in a scratch folder. */
  model?: string;
  /** A hairstyle id (LOOK_OPTIONS' hairstyles) put over the look's. */
  hairstyle?: string;
}

/** The way the camera looks at her from, as a unit vector from her to it. She faces -Z; her right is +X. */
function viewDirection(view: string): Vector3 {
  const s = Math.SQRT1_2;
  const dirs: Record<string, [number, number, number]> = {
    front: [0, 0, -1],
    back: [0, 0, 1],
    left: [-1, 0, 0],
    side: [-1, 0, 0],
    right: [1, 0, 0],
    quarter: [-s, 0, -s],
    quarter_r: [s, 0, -s],
  };
  const d = dirs[view];
  if (!d) throw new Error(`unknown view "${view}": ${Object.keys(dirs).join(", ")}`);
  return new Vector3(...d);
}

/** Which of her parts a mesh is, or null to leave it out: Body, Cloth, Hair, Shoes. */
function partOf(mesh: Object3D): string | null {
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    const m = /^Female_(Body|Cloth|Hair|Shoes)/.exec(o.name);
    if (m) return m[1];
  }
  return null;
}

/** Her meshes as the game dresses her: what's visible, in her four parts, nothing else (cum, props, jewellery). */
function shown(mesh: Object3D): boolean {
  if (!(mesh instanceof Mesh) || !mesh.visible) return false;
  for (let o: Object3D | null = mesh; o; o = o.parent) if (!o.visible) return false;
  if (/Cum|jewel/i.test(mesh.name)) return false;
  return partOf(mesh) !== null;
}

const SKIN: [number, number, number] = [0.93, 0.76, 0.66];
const HAIR: [number, number, number] = [0.36, 0.24, 0.18];

/** Its colour as the look paints it (the material's own), sRGB 0 to 1; flat colours for a "flat" job. */
function lookColour(flat: boolean) {
  return (mesh: Object3D, name: string): [number, number, number] | null => {
    if (!shown(mesh)) return null;
    const flatColour = colourOf(mesh, name);
    if (flat) return flatColour ?? [0.6, 0.6, 0.6];
    const material = (mesh as Mesh).material;
    const m = Array.isArray(material) ? material[0] : material;
    const c = (m as MeshStandardMaterial)?.color as Color | undefined;
    // A pure white material takes its colour from a texture (skin, hair, face), and those are left out here.
    if (!c || c.getHex() === 0xffffff) return partOf(mesh) === "Hair" ? HAIR : (flatColour ?? SKIN);
    const s = c.clone().convertLinearToSRGB();
    return [s.r, s.g, s.b];
  };
}

const SECTION_STEP = 0.01;

/**
 * Her shown meshes cut by level planes every SECTION_STEP up her, as line segments seen from above: per height, per
 * part and material, [x0, z0, x1, z1, ...] in metres (she faces -Z, her right is +X). compare.py draws them and
 * measures how far each piece of clothing stands off her skin.
 */
function writeSections(out: string, meshes: { mesh: Mesh; part: string; world: Float32Array }[], top: number): void {
  const levels = Math.ceil(top / SECTION_STEP);
  const slices: Record<string, number[]>[] = Array.from({ length: levels }, () => ({}));
  for (const { mesh, part, world } of meshes) {
    const index = mesh.geometry.index;
    const count = index ? index.count : world.length / 3;
    const groups = mesh.geometry.groups.length ? mesh.geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const group of groups) {
      const key = `${part}|${materials[group.materialIndex ?? 0]?.name ?? ""}`;
      for (let t = group.start; t + 2 < group.start + group.count; t += 3) {
        const v = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k) * 3);
        const ys = v.map((i) => world[i + 1]);
        const lo = Math.ceil(Math.min(...ys) / SECTION_STEP);
        const hi = Math.floor(Math.max(...ys) / SECTION_STEP);
        for (let l = Math.max(0, lo); l <= Math.min(levels - 1, hi); l++) {
          const y = l * SECTION_STEP;
          const cut: number[] = [];
          for (let e = 0; e < 3; e++) {
            const a = v[e];
            const b = v[(e + 1) % 3];
            const ya = world[a + 1];
            const yb = world[b + 1];
            if ((ya - y) * (yb - y) > 0 || ya === yb) continue;
            const f = (y - ya) / (yb - ya);
            cut.push(world[a] + (world[b] - world[a]) * f, world[a + 2] + (world[b + 2] - world[a + 2]) * f);
          }
          if (cut.length >= 4) (slices[l][key] ??= []).push(...cut.slice(0, 4).map((n) => Math.round(n * 1e4) / 1e4));
        }
      }
    }
  }
  writeFileSync(join(out, "sections.json"), JSON.stringify({ step: SECTION_STEP, slices }));
}

test("ref compare: render her for a reference picture", async () => {
  const job: Job = JSON.parse(readFileSync(process.env.RC_JOB!, "utf8"));
  mkdirSync(job.out, { recursive: true });
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(job.model ?? join("public", "models", "female.glb"))), "");
  const model = gltf.scene;
  const root = model.getObjectByName(NAME) ?? model;
  // Her skin's colour is its texture's, which isn't loaded here: give the material her skin tone, so what the game
  // works out from it (sheer cloth tinted towards her skin) comes out as it does in the game.
  model.traverse((o) => {
    const material = (o as Mesh).material as MeshStandardMaterial | undefined;
    if (material?.name === "T_skin_f" && material.color?.getHex() === 0xffffff) {
      material.color.setRGB(...SKIN).convertSRGBToLinear();
    }
  });
  let look = job.look ?? startLook("Female");
  if (job.outfit) look = wearOutfit("Female", look, job.outfit);
  if (job.sliders) look = { ...look, sliders: { ...look.sliders, ...job.sliders } };
  if (job.hairstyle) look = { ...look, hairstyle: job.hairstyle };
  const dresser = new Dresser(root, NAME);
  dresser.apply(look);
  if (job.nude) dresser.setUndressed(true);
  if (job.posed) {
    // As the game stands her: the walk code standing still (arms spread for her bust).
    const posing = new Body(model, NAME);
    model.updateMatrixWorld(true);
    posing.refreshRest(dresser.legSize(), dresser.armSpread(), dresser.posture(), softHeft(look.sliders));
    for (let f = 0; f < 30; f++) {
      posing.advance(1 / 60);
      posing.pose(0, 0, 0, 0, 0);
    }
  }
  model.updateMatrixWorld(true);

  // Her shown points in the world, posed: for her bounds, and the OBJ.
  const meshes: { mesh: Mesh; part: string; world: Float32Array }[] = [];
  const bounds = new Box3();
  const v = new Vector3();
  model.traverse((o) => {
    if (!shown(o)) return;
    const mesh = o as Mesh;
    const pos = mesh.geometry.getAttribute("position");
    const world = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (mesh instanceof SkinnedMesh) mesh.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(mesh.matrixWorld);
      world.set([v.x, v.y, v.z], i * 3);
      bounds.expandByPoint(v);
    }
    meshes.push({ mesh, part: partOf(mesh)!, world });
  });

  // The frame: her whole body with a margin, or the part compare.py asks for, at the picture's shape.
  const aspect = W / H;
  const centre = bounds.getCenter(new Vector3());
  const tall = bounds.max.y - bounds.min.y;
  const dir = viewDirection(job.view);
  const across = new Vector3(0, 1, 0).cross(dir).normalize();
  let wide = 0;
  for (const { world } of meshes) {
    for (let i = 0; i < world.length; i += 3) {
      v.set(world[i] - centre.x, 0, world[i + 2] - centre.z);
      wide = Math.max(wide, Math.abs(v.dot(across)));
    }
  }
  let frame = job.frame;
  if (!frame) {
    const height = Math.max(tall * 1.06, ((wide * 2) / aspect) * 1.04);
    frame = { cy: centre.y, height };
  }
  const halfH = frame.height / 2;
  const halfW = halfH * aspect;
  const camera = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 20);
  const target = new Vector3(centre.x, frame.cy, centre.z).addScaledVector(across, frame.cx ?? 0);
  camera.position.copy(target).addScaledVector(dir, 8);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  writeFileSync(join(job.out, "render.rgba"), draw(model, NAME, camera, lookColour(job.colours === "flat")));
  writeFileSync(
    join(job.out, "render.json"),
    JSON.stringify({
      w: W,
      h: H,
      background: [40, 40, 48],
      view: job.view,
      // Metres per pixel, and where the picture's centre is in the world: row r is at cy + (h/2 - r - 0.5) * mpp.
      mpp: frame.height / H,
      frame: { cy: frame.cy, height: frame.height, cx: frame.cx ?? 0 },
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      camera: { position: camera.position.toArray(), target: target.toArray(), halfW, halfH },
      outfit: look.outfit ?? null,
    }),
  );

  if (job.sections) writeSections(job.out, meshes, bounds.max.y);

  if (job.obj) {
    // Her shown meshes, one object per part, three's Y-up world turned into Blender's Z-up: (x, y, z) -> (x, -z, y).
    const lines: string[] = [];
    let base = 1;
    const colour = lookColour(job.colours === "flat");
    for (const { mesh, part, world } of meshes) {
      const c = colour(mesh, NAME) ?? [0.6, 0.6, 0.6];
      const key = `${part}_${c.map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;
      lines.push(`o ${mesh.name}`, `usemtl ${key}`);
      for (let i = 0; i < world.length; i += 3) {
        lines.push(`v ${world[i].toFixed(5)} ${(-world[i + 2]).toFixed(5)} ${world[i + 1].toFixed(5)}`);
      }
      const index = mesh.geometry.index;
      const count = index ? index.count : world.length / 3;
      for (let t = 0; t + 2 < count; t += 3) {
        const a = index ? index.getX(t) : t;
        const b = index ? index.getX(t + 1) : t + 1;
        const d = index ? index.getX(t + 2) : t + 2;
        lines.push(`f ${a + base} ${b + base} ${d + base}`);
      }
      base += world.length / 3;
    }
    writeFileSync(join(job.out, "model.obj"), lines.join("\n"));
  }
});
