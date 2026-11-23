import { Mesh, Object3D, Vector3 } from "three";

/**
 * Keeps the third-person camera out of the room's real shapes (walls, the wall over a doorway, shelves, beams, the
 * ceiling), not just the floor plan's wall rectangles. The room's triangles go into a grid on the floor plan once, so
 * a camera check only tests the few hundred near its path; three.js's own raycaster tests all ~76,000 of them per ray
 * (about 9 ms, measured 2026-11-23), far too slow for every frame. The grid is rebuilt when the room changes (build
 * mode, the street), found by a cheap fingerprint of its meshes checked now and then.
 */

/** Grid cells, metres on a side. */
const CELL = 1;
/** How often the room is checked for changes, seconds. */
const RECHECK = 1;

export class CameraCollider {
  private tris = new Float32Array(0);
  private cells = new Map<number, number[]>();
  private stamp = new Uint32Array(0);
  private visit = 0;
  private fingerprint = "";
  private root: Object3D | null = null;
  private sinceCheck = Infinity;
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly c = new Vector3();

  /** Points the collider at a room (the tavern or the street), rebuilding its grid if the room has changed. */
  use(root: Object3D, dt: number): void {
    this.sinceCheck += dt;
    if (root === this.root && this.sinceCheck < RECHECK) return;
    this.sinceCheck = 0;
    const print = fingerprintOf(root);
    if (root === this.root && print === this.fingerprint) return;
    this.root = root;
    this.fingerprint = print;
    this.build(root);
  }

  /**
   * How far from `from` along the unit `dir`, up to `far`, a ball of `radius` can go before touching the room:
   * the nearest hit of five rays, one down the middle and four around it at `radius`.
   */
  clearance(from: Vector3, dir: Vector3, far: number, radius: number): number {
    // Two directions square to the ray, for the four outer rays.
    const ux = Math.abs(dir.y) < 0.9 ? 0 : 1;
    const uy = Math.abs(dir.y) < 0.9 ? 1 : 0;
    // side = dir × up, lift = side × dir.
    let sx = dir.y * 0 - dir.z * uy;
    let sy = dir.z * ux - dir.x * 0;
    let sz = dir.x * uy - dir.y * ux;
    const sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl; sy /= sl; sz /= sl;
    const lx = sy * dir.z - sz * dir.y;
    const ly = sz * dir.x - sx * dir.z;
    const lz = sx * dir.y - sy * dir.x;
    const starts: number[] = [from.x, from.y, from.z];
    for (const [p, q] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      starts.push(from.x + (sx * p + lx * q) * radius, from.y + (sy * p + ly * q) * radius, from.z + (sz * p + lz * q) * radius);
    }

    // The cells under the swept ball.
    const minX = Math.min(from.x, from.x + dir.x * far) - radius;
    const maxX = Math.max(from.x, from.x + dir.x * far) + radius;
    const minZ = Math.min(from.z, from.z + dir.z * far) - radius;
    const maxZ = Math.max(from.z, from.z + dir.z * far) + radius;
    this.visit++;
    if (this.visit === 0xffffffff) {
      this.stamp.fill(0);
      this.visit = 1;
    }
    let nearest = far;
    const { tris, stamp } = this;
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
        const list = this.cells.get(key(cx, cz));
        if (!list) continue;
        for (const t of list) {
          if (stamp[t] === this.visit) continue;
          stamp[t] = this.visit;
          const o = t * 9;
          for (let r = 0; r < 15; r += 3) {
            const hit = rayTriangle(starts[r], starts[r + 1], starts[r + 2], dir.x, dir.y, dir.z, tris, o);
            if (hit >= 0 && hit < nearest) nearest = hit;
          }
        }
      }
    }
    return nearest;
  }

  private build(root: Object3D): void {
    root.updateMatrixWorld(true);
    const all: number[] = [];
    const { a, b, c } = this;
    root.traverse((object) => {
      const mesh = object as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
      // Only the room's own still shapes: not people, nor instanced grass, nor anything hidden.
      if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh || !visibleAll(mesh)) return;
      const position = mesh.geometry.getAttribute("position");
      if (!position) return;
      const index = mesh.geometry.index;
      const count = index ? index.count : position.count;
      const world = mesh.matrixWorld;
      for (let i = 0; i + 2 < count; i += 3) {
        const [i0, i1, i2] = index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2];
        a.fromBufferAttribute(position, i0).applyMatrix4(world);
        b.fromBufferAttribute(position, i1).applyMatrix4(world);
        c.fromBufferAttribute(position, i2).applyMatrix4(world);
        all.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      }
    });
    this.tris = new Float32Array(all);
    const count = this.tris.length / 9;
    this.stamp = new Uint32Array(count);
    this.visit = 0;
    this.cells = new Map();
    const t = this.tris;
    for (let i = 0; i < count; i++) {
      const o = i * 9;
      const x0 = Math.floor(Math.min(t[o], t[o + 3], t[o + 6]) / CELL);
      const x1 = Math.floor(Math.max(t[o], t[o + 3], t[o + 6]) / CELL);
      const z0 = Math.floor(Math.min(t[o + 2], t[o + 5], t[o + 8]) / CELL);
      const z1 = Math.floor(Math.max(t[o + 2], t[o + 5], t[o + 8]) / CELL);
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const k = key(x, z);
          let list = this.cells.get(k);
          if (!list) this.cells.set(k, (list = []));
          list.push(i);
        }
      }
    }
  }
}

function key(x: number, z: number): number {
  return (x + 2048) * 4096 + (z + 2048);
}

function visibleAll(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/** The room's meshes and their geometries, as a string that changes when the room is rebuilt. */
function fingerprintOf(root: Object3D): string {
  let meshes = 0;
  let ids = 0;
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    meshes++;
    ids = (ids * 31 + mesh.geometry.id + (visibleAll(mesh) ? 1 : 0)) % 1_000_000_007;
  });
  return `${meshes}:${ids}`;
}

/** Möller–Trumbore, both faces: the distance along the ray to the triangle at `o` in `t`, or -1 for a miss. */
function rayTriangle(px: number, py: number, pz: number, dx: number, dy: number, dz: number, t: Float32Array, o: number): number {
  const e1x = t[o + 3] - t[o], e1y = t[o + 4] - t[o + 1], e1z = t[o + 5] - t[o + 2];
  const e2x = t[o + 6] - t[o], e2y = t[o + 7] - t[o + 1], e2z = t[o + 8] - t[o + 2];
  const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
  const det = e1x * hx + e1y * hy + e1z * hz;
  if (det > -1e-9 && det < 1e-9) return -1;
  const inv = 1 / det;
  const sx = px - t[o], sy = py - t[o + 1], sz = pz - t[o + 2];
  const u = (sx * hx + sy * hy + sz * hz) * inv;
  if (u < 0 || u > 1) return -1;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * inv;
  if (v < 0 || u + v > 1) return -1;
  const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return d > 1e-4 ? d : -1;
}
