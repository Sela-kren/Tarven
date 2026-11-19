/**
 * Her head as the game shapes it, for the face preview tools (expressions.preview.ts, fit.preview.ts): its meshes as
 * OBJ, and its points piece by piece in the same order for every expression (Blender's Z-up: three's (x, -z, y)).
 */
import { Mesh, SkinnedMesh, Vector3, type Material, type Object3D } from "three";

export const NAME = "Female";
/** Only her head and neck: triangles with every point above this height (metres). */
export const HEAD_FROM = 1.33;

export function visible(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

export function partOf(o: Object3D): string | null {
  for (let p: Object3D | null = o; p; p = p.parent) {
    const m = /^Female_(Body|Hair)/.exec(p.name);
    if (m) return m[1];
  }
  return null;
}

/** Her shown head meshes as OBJ, three's Y-up turned into Blender's Z-up, one object per material. */
export function headObj(model: Object3D): string {
  const lines: string[] = [];
  let base = 1;
  const v = new Vector3();
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof Mesh) || !visible(o) || /Cum|Jewel/i.test(o.name)) return;
    const part = partOf(o);
    if (!part) return;
    const pos = o.geometry.getAttribute("position");
    const world: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(o.matrixWorld);
      world.push(v.x, v.y, v.z);
    }
    const index = o.geometry.index;
    const count = index ? index.count : pos.count;
    const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    const materials: Material[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const group of groups) {
      const tris: number[][] = [];
      for (let t = group.start; t + 2 < group.start + group.count; t += 3) {
        const tri = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k));
        if (tri.every((i) => world[i * 3 + 1] > HEAD_FROM)) tris.push(tri);
      }
      if (!tris.length) continue;
      const used = [...new Set(tris.flat())];
      const remap = new Map(used.map((i, k) => [i, k]));
      const material = materials[group.materialIndex ?? 0]?.name ?? "none";
      lines.push(`o ${part}_${material}`, `usemtl ${material}`);
      for (const i of used) {
        lines.push(`v ${world[i * 3].toFixed(5)} ${(-world[i * 3 + 2]).toFixed(5)} ${world[i * 3 + 1].toFixed(5)}`);
      }
      for (const tri of tris) lines.push(`f ${tri.map((i) => remap.get(i)! + base).join(" ")}`);
      base += used.length;
    }
  });
  return lines.join("\n");
}

export interface HeadPiece {
  name: string;
  /** Points of the mesh kept (those of the head's triangles), and the triangles over them (indices into `points`). */
  points: number[];
  tris: number[];
}

/** Her head's meshes, shown or not, with the triangles above HEAD_FROM: the same for every expression. */
export function headPieces(model: Object3D): { mesh: Mesh; piece: HeadPiece }[] {
  const out: { mesh: Mesh; piece: HeadPiece }[] = [];
  const v = new Vector3();
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof Mesh) || /Cum|Jewel/i.test(o.name) || partOf(o) !== "Body") return;
    const index = o.geometry.index;
    const pos = o.geometry.getAttribute("position");
    const count = index ? index.count : pos.count;
    const y = (i: number) => (o instanceof SkinnedMesh ? o.getVertexPosition(i, v) : v.fromBufferAttribute(pos, i)).applyMatrix4(o.matrixWorld).y;
    const tris: number[] = [];
    for (let t = 0; t + 2 < count; t += 3) {
      const tri = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k));
      if (tri.every((i) => y(i) > HEAD_FROM)) tris.push(...tri);
    }
    if (!tris.length) return;
    const points = [...new Set(tris)];
    const remap = new Map(points.map((i, k) => [i, k]));
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    out.push({ mesh: o, piece: { name: material?.name ?? o.name, points, tris: tris.map((i) => remap.get(i)!) } });
  });
  return out;
}

/** Where each kept point is now (Blender's Z-up), and whether the piece shows. */
export function headFrame(pieces: { mesh: Mesh; piece: HeadPiece }[]): { shown: boolean; co: number[] }[] {
  const v = new Vector3();
  return pieces.map(({ mesh, piece }) => {
    const pos = mesh.geometry.getAttribute("position");
    const co: number[] = [];
    for (const i of piece.points) {
      if (mesh instanceof SkinnedMesh) mesh.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(mesh.matrixWorld);
      co.push(+v.x.toFixed(5), +(-v.z).toFixed(5), +v.y.toFixed(5));
    }
    return { shown: visible(mesh), co };
  });
}

