/**
 * TEMPORARY (2026-11-23): every player outfit on her as the game dresses and stands her, front / three-quarter / side /
 * back, each mesh in its material's own colour, plus a count of cloth points inside her skin. Writes PNGs to POSE_OUT.
 * Run: ONLY=tools/posepreview/outfitsheet.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { test } from "vitest";
import { Color, Mesh, Object3D, PerspectiveCamera, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, LOOK_OPTIONS, playerOutfits, startLook, wearOutfit } from "../../src/game/appearance";
import { colourOf, draw, H, stripImages, W } from "./raster";
import { Body } from "../../src/game/player";
import { softHeft } from "../../src/game/heft";

const NAME = (process.env.BODY ?? "Female") as "Female" | "Male";

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function png(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function visible(o: Object3D): boolean { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; }

const c = new Color();
let matColour = new Map<string, string>();
function colouring(mesh: Object3D, name: string): [number, number, number] | null {
  let part = "";
  for (let o: Object3D | null = mesh; o; o = o.parent) if (o.name.startsWith(`${name}_`)) { part = o.name; break; }
  const isCloth = /_(Cloth|Shoes|Jewel)/.test(part);
  const base = colourOf(mesh, name);
  if (!isCloth && !/_Hair/.test(part)) return process.env.GREEN && base ? [0.1, 0.9, 0.2] : base;
  const m = (mesh as Mesh).material as { name?: string } | undefined;
  const mat = m && !Array.isArray(m) ? m.name ?? "" : "";
  if (/_Hair/.test(part)) return [0.85, 0.85, 0.88];
  const hex = matColour.get(mat);
  if (hex) { c.set(hex); return [c.r, c.g, c.b]; }
  let h = 0; for (const ch of mat) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  c.setHSL((h % 360) / 360, 0.45, 0.6); return [c.r, c.g, c.b];
}

test("outfit sheet", async () => {
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out", "outfits");
  mkdirSync(out, { recursive: true });
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), `${NAME.toLowerCase()}.glb`));
  const ids = process.env.SHOES ? process.env.SHOES.split(",") : process.env.IDS ? process.env.IDS.split(",") : (process.env.ALL ? LOOK_OPTIONS[NAME].outfits : playerOutfits(NAME)).map((o) => o.id);
  const report: string[] = [];
  for (const id of ids) {
    const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
    const model = gltf.scene;
    const root = model.getObjectByName(NAME) ?? model;
    const look = wearOutfit(NAME, startLook(NAME), process.env.SHOES ? "tee" : id);
    if (process.env.SHOES) { if (id !== "own") look.shoes = id; }
    matColour = new Map();
    for (const def of LOOK_OPTIONS[NAME].colors) {
      const hex = look.colors[def.id];
      if (hex) for (const [, mat] of def.parts) matColour.set(mat, hex);
    }
    const posing = new Body(model, NAME);
    const dresser = new Dresser(root, NAME);
    dresser.apply(look);
    model.updateMatrixWorld(true);
    posing.refreshRest(dresser.legSize(), dresser.armSpread(), dresser.posture(), softHeft(look.sliders));
    for (let f = 0; f < 30; f++) { posing.advance(1 / 60); posing.pose(0, 0, 0, 0, 0); }
    model.updateMatrixWorld(true);

    // clip count: cloth points more than 3 mm inside her skin, by height band
    const v = new Vector3();
    const bp: number[] = [], bn: number[] = [], cloth: { p: Vector3; mesh: string }[] = [];
    model.traverse((o) => {
      if (!(o instanceof SkinnedMesh) || !visible(o)) return;
      const isBody = new RegExp(`^${NAME}_Body(_\\d+)?$`).test(o.name) || o.parent?.name === `${NAME}_Body` && /T_skin/.test((o.material as { name: string }).name);
      const inCloth = (() => { for (let p: Object3D | null = o; p; p = p.parent) if (p.name.startsWith(`${NAME}_Cloth`)) return true; return false; })();
      if (!isBody && !inCloth) return;
      const pos = o.geometry.getAttribute("position");
      const world: Vector3[] = [];
      for (let i = 0; i < pos.count; i++) { o.getVertexPosition(i, v); world.push(v.clone().applyMatrix4(o.matrixWorld)); }
      if (inCloth) { for (const p of world) cloth.push({ p, mesh: (o.material as { name: string }).name }); return; }
      const nrm = world.map(() => new Vector3());
      const idx = o.geometry.index!;
      for (let t = 0; t < idx.count; t += 3) {
        const a = idx.getX(t), b = idx.getX(t + 1), cc = idx.getX(t + 2);
        const n = new Vector3().subVectors(world[b], world[a]).cross(new Vector3().subVectors(world[cc], world[a]));
        nrm[a].add(n); nrm[b].add(n); nrm[cc].add(n);
      }
      world.forEach((p, i) => { const n = nrm[i].normalize(); bp.push(p.x, p.y, p.z); bn.push(n.x, n.y, n.z); });
    });
    const cell = 0.01; const grid = new Map<string, number[]>();
    const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    for (let i = 0; i < bp.length / 3; i++) { const k = key(bp[i * 3], bp[i * 3 + 1], bp[i * 3 + 2]); (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); }
    const byMat = new Map<string, { n: number; worst: number; ys: number[] }>();
    for (const { p, mesh } of cloth) {
      let best = -1, bd = 1e9;
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++)
        for (const i of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
          const d = (bp[i * 3] - p.x) ** 2 + (bp[i * 3 + 1] - p.y) ** 2 + (bp[i * 3 + 2] - p.z) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
      if (best < 0) continue;
      const depth = (p.x - bp[best * 3]) * bn[best * 3] + (p.y - bp[best * 3 + 1]) * bn[best * 3 + 1] + (p.z - bp[best * 3 + 2]) * bn[best * 3 + 2];
      if (depth < -0.003) {
        const e = byMat.get(mesh) ?? byMat.set(mesh, { n: 0, worst: 0, ys: [] }).get(mesh)!;
        e.n++; e.worst = Math.min(e.worst, depth); e.ys.push(p.y);
      }
    }
    const meshes = new Set<string>();
    model.traverse((o) => { if (o instanceof Mesh && visible(o)) for (let p: Object3D | null = o; p; p = p.parent) if (p.name.startsWith(`${NAME}_Cloth`) || p.name.startsWith(`${NAME}_Shoes`)) { meshes.add(p.name); break; } });
    const clipLine = [...byMat].map(([m, e]) => { e.ys.sort(); return `${m} ${e.n} pts, worst ${(-e.worst * 1000).toFixed(0)}mm, y ${e.ys[0].toFixed(2)}-${e.ys[e.ys.length - 1].toFixed(2)}`; });
    report.push(`${id}: ${cloth.length} cloth pts; meshes ${[...meshes].join(" ")}\n  ${clipLine.join("\n  ") || "no clipping > 3mm"}`);

    if (process.env.SHOES) {
      // How high her lowest point stands: on the floor (0) if the Dresser lifted her onto her heels right.
      let lowest = Infinity;
      const v2 = new Vector3();
      model.traverse((o) => {
        if (!(o instanceof SkinnedMesh) || !visible(o)) return;
        if (!/_(Body|Shoes)/.test(o.name) && !/_(Body|Shoes)/.test(o.parent?.name ?? "")) return;
        const pos = o.geometry.getAttribute("position");
        for (let i = 0; i < pos.count; i += 3) { o.getVertexPosition(i, v2); v2.applyMatrix4(o.matrixWorld); lowest = Math.min(lowest, v2.y); }
      });
      const tipBone = model.getObjectByName(`${NAME}_Foot_R`);
      console.log(`SHOE ${id}: lowest ${lowest.toFixed(4)} m, foot turn ${tipBone ? (2 * Math.acos(Math.min(1, Math.abs(tipBone.quaternion.w))) * 180 / Math.PI).toFixed(1) : "no bone"} deg`);
      const fv: Vector3[] = [new Vector3(0.95, 0.1, -0.08), new Vector3(0.5, 0.28, -0.62), new Vector3(0.35, 0.25, 0.6), new Vector3(2.6, 0.85, -0.3)];
      const sh = new Uint8Array(W * 4 * H * 4);
      fv.forEach((pos, k) => {
        const camera = new PerspectiveCamera(k === 3 ? 36 : 22, W / H, 0.02, 30);
        camera.position.copy(pos);
        if (k === 3) camera.lookAt(0, 0.8, 0); else camera.lookAt(0.1, 0.07, -0.07);
        camera.updateProjectionMatrix();
        const img = draw(model, NAME, camera, colouring);
        for (let y = 0; y < H; y++) sh.set(img.subarray(y * W * 4, (y + 1) * W * 4), (y * W * 4 + k * W) * 4);
      });
      writeFileSync(join(out, `shoe_${id}.png`), png(W * 4, H, sh));
      continue;
    }
    const views: [string, Vector3][] = [["front", new Vector3(0.6, 1.4, -3.2)], ["three", new Vector3(-2.2, 0.95, -2.3)], ["side", new Vector3(-3.2, 0.95, 0)], ["back", new Vector3(0, 0.95, 3.2)]];
    const sheet = new Uint8Array(W * 4 * H * 4);
    views.forEach(([, pos], k) => {
      const camera = new PerspectiveCamera(32, W / H, 0.05, 30);
      camera.position.copy(pos); camera.lookAt(0, 0.88, 0); camera.updateProjectionMatrix();
      const img = draw(model, NAME, camera, colouring);
      for (let y = 0; y < H; y++) sheet.set(img.subarray(y * W * 4, (y + 1) * W * 4), (y * W * 4 + k * W) * 4);
    });
    writeFileSync(join(out, `${id}.png`), png(W * 4, H, sheet));
    // close-up of the torso, front and side
    const close = new Uint8Array(W * 2 * H * 4);
    ([new Vector3(0, 1.15, -1.5), new Vector3(-1.5, 1.15, -0.05)] as Vector3[]).forEach((pos, k) => {
      const camera = new PerspectiveCamera(26, W / H, 0.05, 30);
      camera.position.copy(pos); camera.lookAt(0, 1.05, -0.03); camera.updateProjectionMatrix();
      const img = draw(model, NAME, camera, colouring);
      for (let y = 0; y < H; y++) close.set(img.subarray(y * W * 4, (y + 1) * W * 4), (y * W * 2 + k * W) * 4);
    });
    writeFileSync(join(out, `${id}_close.png`), png(W * 2, H, close));
    console.log(report[report.length - 1]);
  }
  writeFileSync(join(out, "report.txt"), report.join("\n"));
});
