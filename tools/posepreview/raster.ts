/** The preview's software rasteriser: a model's skin posed on the CPU and its triangles filled into a depth buffer. */
import { Camera, Matrix4, Object3D, SkinnedMesh, Mesh, Vector3 } from "three";

/** How a mesh is coloured, or null to leave it out (colourOf by default). */
export type Colouring = (mesh: Object3D, name: string) => [number, number, number] | null;

export const W = Number(process.env.PREVIEW_W ?? 336);
export const H = Number(process.env.PREVIEW_H ?? 560);

/** The GLB with its pictures taken out, so it loads without a browser to decode them. */
export function stripImages(file: Buffer): ArrayBuffer {
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const m of json.materials ?? []) {
    const pbr = m.pbrMetallicRoughness ?? {};
    delete pbr.baseColorTexture;
    delete pbr.metallicRoughnessTexture;
    delete m.normalTexture;
    delete m.occlusionTexture;
    delete m.emissiveTexture;
    m.extensions = undefined;
  }
  const text = Buffer.from(JSON.stringify(json), "utf8");
  const pad = (4 - (text.length % 4)) % 4;
  const jsonChunk = Buffer.concat([text, Buffer.alloc(pad, 0x20)]);
  const rest = file.subarray(20 + jsonLength);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  const chunkHead = Buffer.alloc(8);
  chunkHead.writeUInt32LE(jsonChunk.length, 0);
  chunkHead.writeUInt32LE(0x4e4f534a, 4);
  const out = Buffer.concat([header, chunkHead, jsonChunk, rest]);
  out.writeUInt32LE(out.length, 8);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.length);
}

const SHOWN: Record<string, [number, number, number]> = {
  Body: [0.93, 0.76, 0.66],
  Cloth: [0.3, 0.38, 0.62],
  Hair: [0.55, 0.3, 0.7],
  Shoes: [0.25, 0.2, 0.18],
  Wood: [0.48, 0.32, 0.2],
};

/** The parts of her face drawn in their own colours, by material: eye dots, brows, lips, teeth, tongue, lines. */
const FACE_COLOURS: [RegExp, [number, number, number]][] = [
  [/^T_soot$/, [0.05, 0.04, 0.06]],
  [/^T_hair_f$/, [0.25, 0.12, 0.32]],
  [/^T_lip/, [0.78, 0.36, 0.4]],
  [/^T_mouth$/, [0.3, 0.06, 0.08]],
  [/^T_teeth/, [0.97, 0.95, 0.9]],
  [/^T_tongue$/, [0.9, 0.42, 0.5]],
  [/^T_(crease|hatch)/, [0.55, 0.18, 0.2]],
];

export function colourOf(mesh: Object3D, name: string): [number, number, number] | null {
  const material = (mesh as Mesh).material;
  const materialName = material && !Array.isArray(material) ? material.name : "";
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    if (o.name === `${name}_Body`) {
      for (const [test, colour] of FACE_COLOURS) if (test.test(materialName)) return colour;
    }
    // BARE leaves her clothes off, so the pose of her legs shows.
    if (process.env.BARE === "1" && o.name === `${name}_Cloth`) return null;
    // OUTFIT draws one of her other outfits too (its mesh name after "Cloth": Tee, Plunge...), pale, over the skin.
    if (process.env.OUTFIT && o.name === `${name}_Cloth${process.env.OUTFIT}`) return [0.92, 0.92, 0.9];
    for (const [part, colour] of Object.entries(SHOWN)) if (o.name === `${name}_${part}`) return colour;
  }
  return null;
}

export function draw(model: Object3D, name: string, camera: Camera, colour: Colouring = colourOf): Uint8Array {
  return drawAll([{ model, name }], camera, colour);
}

/** Several bodies into the one picture, each in front of or behind the others as they stand. */
export function drawAll(
  items: readonly { model: Object3D; name: string }[],
  camera: Camera,
  colour: Colouring = colourOf,
): Uint8Array {
  const rgba = new Uint8Array(W * H * 4);
  const depth = new Float32Array(W * H).fill(Infinity);
  for (let i = 0; i < W * H; i++) rgba.set([40, 40, 48, 255], i * 4);
  for (const { model, name } of items) drawInto(model, name, camera, rgba, depth, colour);
  return rgba;
}

function drawInto(
  model: Object3D,
  name: string,
  camera: Camera,
  rgba: Uint8Array,
  depth: Float32Array,
  colourFor: Colouring,
): void {
  model.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const viewProj = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const ortho = (camera as { isOrthographicCamera?: boolean }).isOrthographicCamera === true;
  const facing = camera.getWorldDirection(new Vector3()).negate();
  // An orthographic camera (the ref compare's) is lit from its own side, up and to the left, whichever way it looks.
  const light = ortho
    ? facing
        .clone()
        .multiplyScalar(0.75)
        .add(new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.55))
        .add(new Vector3(-1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.35))
        .normalize()
    : new Vector3(-0.4, 0.6, 0.7).normalize();
  const v = new Vector3();
  model.traverse((o) => {
    if (!(o instanceof Mesh) || !o.visible) return;
    const colour = colourFor(o, name);
    if (!colour) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const world: Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      world.push(v.clone().applyMatrix4(o.matrixWorld));
    }
    const screen = world.map((p) => {
      const s = p.clone().applyMatrix4(viewProj);
      return [((s.x + 1) / 2) * W, ((1 - s.y) / 2) * H, s.z] as const;
    });
    const index = geo.index;
    const count = index ? index.count : pos.count;
    const ab = new Vector3();
    const ac = new Vector3();
    for (let t = 0; t < count; t += 3) {
      const ia = index ? index.getX(t) : t;
      const ib = index ? index.getX(t + 1) : t + 1;
      const ic = index ? index.getX(t + 2) : t + 2;
      ab.subVectors(world[ib], world[ia]);
      ac.subVectors(world[ic], world[ia]);
      const n = ab.cross(ac).normalize();
      // Lit from the camera's side whichever way the triangle winds (an orthographic camera's side is its facing).
      const toCam = ortho ? facing : camera.position.clone().sub(world[ia]).normalize();
      if (n.dot(toCam) < 0) n.negate();
      const shade = 0.35 + 0.65 * Math.max(0, n.dot(light));
      const [a, b, c] = [screen[ia], screen[ib], screen[ic]];
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(area) < 1e-9) continue;
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
          rgba.set([colour[0] * shade * 255, colour[1] * shade * 255, colour[2] * shade * 255, 255], k * 4);
        }
      }
    }
  });
}

