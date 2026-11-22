/**
 * A packed character model back to ordinary numbers as it loads. tools/blender/glb_pack.py stores her normals in 8 bits,
 * her skin weights and most texture coordinates in 16 (glTF's KHR_mesh_quantization), which the GPU could draw as they
 * are; but the game's own code reads and rewrites them as floats (the Dresser relights her as it reshapes her, the
 * close-ups read her UVs), so each such attribute is turned back into a plain Float32 one, once. Her per-cup keys come
 * sparse, which the loader already rebuilds in full.
 */
import { BufferAttribute, type BufferGeometry, type Mesh, type Object3D } from "three";

/** Turns one geometry's packed attributes (normalized integers, or interleaved) into plain floats. */
export function unpackGeometry(geometry: BufferGeometry): void {
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    // Only what was packed: normalized integers, or interleaved (her 8-bit normals are padded to 4 a point). Plain
    // integer attributes (skin indices) stay as they are.
    const interleaved = "isInterleavedBufferAttribute" in attribute;
    if (!attribute.normalized && !interleaved) continue;
    const { count, itemSize } = attribute;
    const array = new Float32Array(count * itemSize);
    // getX and the rest undo the normalizing and the interleaving.
    const get = [attribute.getX, attribute.getY, attribute.getZ, attribute.getW];
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < itemSize; k++) array[i * itemSize + k] = get[k].call(attribute, i);
    }
    const unpacked = new BufferAttribute(array, itemSize);
    geometry.setAttribute(name, unpacked);
    // 8 bits a component leaves a normal a hair off unit length.
    if (name === "normal") {
      for (let i = 0; i < count; i++) {
        const x = array[i * 3], y = array[i * 3 + 1], z = array[i * 3 + 2];
        const length = Math.hypot(x, y, z) || 1;
        array[i * 3] = x / length;
        array[i * 3 + 1] = y / length;
        array[i * 3 + 2] = z / length;
      }
    }
  }
}

/** Every mesh's geometry under `root` unpacked (each geometry once). */
export function unpackModel(root: Object3D): void {
  const done = new Set<BufferGeometry>();
  root.traverse((object) => {
    const geometry = (object as Mesh).geometry;
    if (!(object as Mesh).isMesh || !geometry || done.has(geometry)) return;
    done.add(geometry);
    unpackGeometry(geometry);
  });
}
