/**
 * Close-ups of his penis and scrotum as the game shapes them, for checking the model's detail by eye. Writes PNGs
 * to POSE_OUT (default tools/posepreview/out/penis): each type in TYPES (comma separated, default uncut,cut) at each
 * arousal in AROUSALS (default 0,0.5,1), from the side, front, under and top. MODELS reads male.glb from another
 * folder (a fresh build), TEXTURES draws the painting from a folder of textures (art/textures), ZOOM sets how close
 * (default 2.6), LIGHT=graze lights from the side to bring out the relief, TAG prefixes the file names.
 * Run: ONLY=tools/posepreview/penis.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { test } from "vitest";
import { Box3, Matrix4, Mesh, PerspectiveCamera, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, newLook } from "../../src/game/appearance";
import { stripImages } from "./raster";

const W = 420;
const H = 420;
const COLOURS: Record<string, [number, number, number]> = {
  T_penis: [0.86, 0.62, 0.52],
  T_glans: [0.9, 0.5, 0.52],
  T_scrotum: [0.78, 0.55, 0.47],
};
const SKIN: [number, number, number] = [0.93, 0.76, 0.66];

/** An 8-bit, non-interlaced RGB or RGBA PNG, decoded to RGB 0 to 1, row 0 at the top. */
interface Tex {
  w: number;
  h: number;
  px: Float32Array;
}
function readPng(file: Buffer): Tex {
  let at = 8;
  let w = 0;
  let h = 0;
  let channels = 4;
  const data: Buffer[] = [];
  while (at < file.length) {
    const len = file.readUInt32BE(at);
    const type = file.toString("ascii", at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      channels = body[9] === 6 ? 4 : body[9] === 2 ? 3 : body[9] === 4 ? 2 : 1;
    } else if (type === "IDAT") data.push(body);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = w * channels;
  const out = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let p = 0;
      if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = (v + p) & 0xff;
    }
  }
  const px = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) for (let k = 0; k < 3; k++) px[i * 3 + k] = out[i * channels + Math.min(k, channels - 1)] / 255;
  return { w, h, px };
}
/** TEXTURES: a folder of the build's textures, to draw the penis's painting on it. */
const TEXTURES: Record<string, Tex> = {};
if (process.env.TEXTURES) {
  for (const name of Object.keys(COLOURS)) TEXTURES[name] = readPng(readFileSync(join(process.env.TEXTURES, `${name}.png`)));
}
/** Tinted so the painting averages to the preview's colour for it. */
function sampler(name: string): ((u: number, v: number) => [number, number, number]) | null {
  const tex = TEXTURES[name];
  if (!tex) return null;
  const avg = [0, 0, 0];
  for (let i = 0; i < tex.w * tex.h; i++) for (let k = 0; k < 3; k++) avg[k] += tex.px[i * 3 + k] / (tex.w * tex.h);
  const want = COLOURS[name];
  return (u, v) => {
    const x = Math.min(tex.w - 1, Math.max(0, Math.floor(u * tex.w)));
    const y = Math.min(tex.h - 1, Math.max(0, Math.floor(v * tex.h)));
    const i = (y * tex.w + x) * 3;
    return [0, 1, 2].map((k) => (tex.px[i + k] / avg[k]) * want[k]) as [number, number, number];
  };
}

function png(rgba: Uint8Array, w: number, h: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Smooth-shaded, so the shape's detail reads as it will in the game rather than as facets. */
function render(model: Object3D, camera: PerspectiveCamera): Uint8Array {
  const rgba = new Uint8Array(W * H * 4);
  const depth = new Float32Array(W * H).fill(Infinity);
  for (let i = 0; i < W * H; i++) rgba.set([40, 40, 48, 255], i * 4);
  model.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const viewProj = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const camRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const camUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const camBack = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  // LIGHT=graze lights it from the side, so the shape's relief shows.
  const graze = process.env.LIGHT === "graze";
  const light = camBack.clone().multiplyScalar(graze ? 0.35 : 1).addScaledVector(camRight, graze ? -0.9 : -0.6).addScaledVector(camUp, 0.7).normalize();
  const v = new Vector3();
  model.traverse((o) => {
    if (!(o instanceof Mesh) || !o.visible) return;
    for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    let inBody = false;
    for (let p: Object3D | null = o; p; p = p.parent) if (p.name === "Male_Body") inBody = true;
    if (!inBody || /Outline/.test(o.name)) return;
    const colour = COLOURS[mat.name] ?? SKIN;
    const geo = o.geometry;
    const paint = sampler(mat.name);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    const world: Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      world.push(v.clone().applyMatrix4(o.matrixWorld));
    }
    // Vertex normals from the posed triangles, welded by position so the seams don't show.
    const key = (p: Vector3) => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
    const welded = new Map<string, Vector3>();
    const index = geo.index;
    const count = index ? index.count : pos.count;
    const at = (t: number) => (index ? index.getX(t) : t);
    for (let t = 0; t < count; t += 3) {
      const [a, b, c] = [world[at(t)], world[at(t + 1)], world[at(t + 2)]];
      const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
      for (const p of [a, b, c]) {
        const k = key(p);
        welded.set(k, (welded.get(k) ?? new Vector3()).add(n));
      }
    }
    const normals = world.map((p) => welded.get(key(p))!.clone().normalize());
    const screen = world.map((p) => {
      const s = p.clone().applyMatrix4(viewProj);
      return [((s.x + 1) / 2) * W, ((1 - s.y) / 2) * H, s.z] as const;
    });
    for (let t = 0; t < count; t += 3) {
      const ids = [at(t), at(t + 1), at(t + 2)];
      const [a, b, c] = ids.map((i) => screen[i]);
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(area) < 1e-9) continue;
      const toCam = camera.position.clone().sub(world[ids[0]]).normalize();
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
          const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
          const k = y * W + x;
          if (z >= depth[k]) continue;
          depth[k] = z;
          const n = normals[ids[0]].clone().multiplyScalar(w0).addScaledVector(normals[ids[1]], w1).addScaledVector(normals[ids[2]], w2).normalize();
          if (n.dot(toCam) < 0) n.negate();
          const shade = 0.25 + 0.75 * Math.max(0, n.dot(light));
          const col = paint && uv
            ? paint(
                w0 * uv.getX(ids[0]) + w1 * uv.getX(ids[1]) + w2 * uv.getX(ids[2]),
                w0 * uv.getY(ids[0]) + w1 * uv.getY(ids[1]) + w2 * uv.getY(ids[2]),
              )
            : colour;
          rgba.set([Math.min(255, col[0] * shade * 255), Math.min(255, col[1] * shade * 255), Math.min(255, col[2] * shade * 255), 255], k * 4);
        }
      }
    }
  });
  return rgba;
}

function penisBox(model: Object3D): Box3 {
  const box = new Box3();
  const v = new Vector3();
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mat.name !== "T_penis" && mat.name !== "T_glans") return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      box.expandByPoint(v.clone().applyMatrix4(o.matrixWorld));
    }
  });
  return box;
}

test("penis close-ups", async () => {
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out", "penis");
  mkdirSync(out, { recursive: true });
  const types = (process.env.TYPES ?? "uncut,cut").split(",");
  const arousals = (process.env.AROUSALS ?? "0,0.5,1").split(",").map(Number);
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), "male.glb"));
  for (const type of types) {
    for (const a of arousals) {
      const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
      const model = gltf.scene;
      const root = model.getObjectByName("Male") ?? model;
      const dresser = new Dresser(root, "Male");
      const look = newLook();
      look.penis = type;
      dresser.apply(look);
      dresser.setDressing("nude");
      dresser.setErection(a);
      const box = penisBox(model);
      const centre = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3()).length();
      // Out of him is -z; his right +x.
      const views: [string, Vector3][] = [
        ["side", new Vector3(1, 0.1, -0.15)],
        ["front", new Vector3(0.35, 0.25, -1)],
        ["under", new Vector3(0.25, -0.55, -1)],
        ["top", new Vector3(0.3, 1, -0.5)],
      ];
      for (const [name, dir] of views) {
        const camera = new PerspectiveCamera(24, W / H, 0.01, 10);
        camera.position.copy(centre).addScaledVector(dir.normalize(), size * Number(process.env.ZOOM ?? 2.6));
        camera.lookAt(centre);
        camera.updateProjectionMatrix();
        writeFileSync(join(out, `${process.env.TAG ?? "now"}_${type}_${a}_${name}.png`), png(render(model, camera), W, H));
      }
    }
  }
});
