/**
 * How many points of her top end up inside her skin, at each cup size, as the game dresses her (Dresser, rest pose).
 * Prints one line per cup: points inside, deepest (mm), and where (height band). OUTFIT_ID picks the outfit (tee).
 * Run: ONLY=tools/posepreview/clipcheck.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, newLook, stopValue } from "../../src/game/appearance";
import { stripImages } from "./raster";

const NAME = "Female";
const under = (o: Object3D, name: string) => { for (let p: Object3D | null = o; p; p = p.parent) if (p.name === name) return true; return false; };

function worldPoints(o: Mesh): Float32Array {
  const pos = o.geometry.getAttribute("position");
  const out = new Float32Array(pos.count * 3);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (o instanceof SkinnedMesh) o.applyBoneTransform(i, v);
    v.applyMatrix4(o.matrixWorld);
    out.set([v.x, v.y, v.z], i * 3);
  }
  return out;
}

function normals(co: Float32Array, idx: ArrayLike<number>): Float32Array {
  const n = new Float32Array(co.length);
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const ux = co[b] - co[a], uy = co[b + 1] - co[a + 1], uz = co[b + 2] - co[a + 2];
    const vx = co[c] - co[a], vy = co[c + 1] - co[a + 1], vz = co[c + 2] - co[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  return n;
}

test("cloth inside skin per cup", async () => {
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), "female.glb"));
  const lines: string[] = [];
  for (const cup of (process.env.CUPS ?? "A,C,F,J,M,Q,U,Z").split(",")) {
    const model = (await new GLTFLoader().parseAsync(stripImages(file), "")).scene;
    const root = model.getObjectByName(NAME) ?? model;
    const look = newLook();
    look.outfit = process.env.OUTFIT_ID ?? "tee";
    look.sliders.bust = stopValue(CUPS, CUPS.labels.indexOf(cup));
    new Dresser(root, NAME).apply(look);
    model.updateMatrixWorld(true);
    const skin: { co: Float32Array; n: Float32Array }[] = [];
    const cloth: { name: string; co: Float32Array }[] = [];
    model.traverse((o) => {
      if (!(o instanceof Mesh) || !o.visible) return;
      let vis = true; for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) vis = false;
      if (!vis) return;
      if (under(o, `${NAME}_Body`) && !/jewel/i.test(o.name)) {
        const co = worldPoints(o);
        const idx = o.geometry.index ? o.geometry.index.array : Array.from({ length: co.length / 3 }, (_, i) => i);
        skin.push({ co, n: normals(co, idx) });
      } else if (/cloth/i.test(o.name) || /cloth/i.test(o.parent?.name ?? "")) {
        cloth.push({ name: o.name, co: worldPoints(o) });
      }
    });
    // grid of skin points
    const cell = 0.02, grid = new Map<string, number[]>();
    const sc = skin.flatMap((s) => Array.from(s.co)), sn = skin.flatMap((s) => Array.from(s.n));
    for (let i = 0; i < sc.length; i += 3) {
      const k = `${Math.floor(sc[i] / cell)},${Math.floor(sc[i + 1] / cell)},${Math.floor(sc[i + 2] / cell)}`;
      (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
    }
    for (const c of cloth) {
      let inside = 0, deep = 0; const bands: Record<string, number> = {};
      for (let i = 0; i < c.co.length; i += 3) {
        const [x, y, z] = [c.co[i], c.co[i + 1], c.co[i + 2]];
        let best = -1, bd = 1e9;
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell), gz = Math.floor(z / cell);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          for (const j of grid.get(`${gx + dx},${gy + dy},${gz + dz}`) ?? []) {
            const d = (sc[j] - x) ** 2 + (sc[j + 1] - y) ** 2 + (sc[j + 2] - z) ** 2;
            if (d < bd) { bd = d; best = j; }
          }
        }
        if (best < 0) continue;
        const nl = Math.hypot(sn[best], sn[best + 1], sn[best + 2]) || 1;
        const s = ((x - sc[best]) * sn[best] + (y - sc[best + 1]) * sn[best + 1] + (z - sc[best + 2]) * sn[best + 2]) / nl;
        if (s < -0.0005) {
          inside++; deep = Math.max(deep, -s);
          const band = `${(Math.floor(y * 10) / 10).toFixed(1)}${z < sc[best + 2] ? "" : ""}${z < -0.0 ? "f" : "b"}`;
          bands[band] = (bands[band] ?? 0) + 1;
        }
      }
      lines.push(`CLIP ${cup} ${c.name} pts=${c.co.length / 3} inside=${inside} deepest_mm=${(deep * 1000).toFixed(1)} ${JSON.stringify(bands)}`);
    }
  }
  writeFileSync(process.env.CLIP_OUT ?? "clip.txt", lines.join("\n"));
}, 600000);
