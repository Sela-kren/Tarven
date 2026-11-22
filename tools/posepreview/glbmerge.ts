/**
 * A split character GLB (tools/blender/glb_split.py) with its outfit files put back in, for the tools: the base lists
 * them in `asset.extras.tarvenOutfits` ({"Tee": "female/Tee.glb", ...}, relative to its folder), and each outfit's
 * objects go back under the same parent (her armature) on the base's skin, the same bones. The same as glb_split.py's
 * merge(). A GLB without outfit files comes back as it was.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

function read(file: Buffer): { doc: Doc; bin: Buffer } {
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8")) as Doc;
  const binStart = 20 + jsonLength;
  const binLength = binStart + 8 <= file.length ? file.readUInt32LE(binStart) : 0;
  return { doc, bin: file.subarray(binStart + 8, binStart + 8 + binLength) };
}

function write(doc: Doc, bin: Buffer): Buffer {
  const text = Buffer.from(JSON.stringify(doc), "utf8");
  const json = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const data = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + data.length, 8);
  const head = (length: number, type: number) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(length, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  return Buffer.concat([header, head(json.length, 0x4e4f534a), json, head(data.length, 0x004e4942), data]);
}

/** Bumps every texture index in a material (any "...Texture": { index }) by `by`. */
function bumpTextures(obj: unknown, by: number): void {
  if (Array.isArray(obj)) obj.forEach((v) => bumpTextures(v, by));
  else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (/Texture$/.test(k) && v && typeof v === "object" && "index" in v) v.index += by;
      bumpTextures(v, by);
    }
  }
}

/** The GLB with its outfit files (read from `folder`, where the base lives) put back in. */
export function mergeOutfits(file: Buffer, folder: string): Buffer {
  const { doc, bin } = read(file);
  const listed = doc.asset?.extras?.tarvenOutfits as Record<string, string> | undefined;
  if (!listed) return file;
  delete doc.asset.extras.tarvenOutfits;
  const parts: Buffer[] = [bin];
  let length = bin.length;
  const byName = new Map<string, number>((doc.nodes as Doc[]).map((n, i) => [n.name, i]));
  for (const relative of Object.values(listed)) {
    const path = join(folder, relative);
    if (!existsSync(path)) throw new Error(`outfit file missing: ${path}`);
    const { doc: part, bin: partBin } = read(readFileSync(path));
    const shift: Record<string, number> = {};
    for (const key of ["accessors", "bufferViews", "materials", "textures", "images", "samplers", "meshes"]) shift[key] = (doc[key] ?? []).length;
    const pad = (4 - (length % 4)) % 4;
    parts.push(Buffer.alloc(pad, 0), partBin);
    const offset = length + pad;
    length = offset + partBin.length;
    for (const v of part.bufferViews ?? []) v.byteOffset = (v.byteOffset ?? 0) + offset;
    for (const a of part.accessors ?? []) {
      if (a.bufferView !== undefined) a.bufferView += shift.bufferViews;
      if (a.sparse) {
        a.sparse.indices.bufferView += shift.bufferViews;
        a.sparse.values.bufferView += shift.bufferViews;
      }
    }
    for (const im of part.images ?? []) if (im.bufferView !== undefined) im.bufferView += shift.bufferViews;
    for (const t of part.textures ?? []) {
      if (t.source !== undefined) t.source += shift.images;
      if (t.sampler !== undefined) t.sampler += shift.samplers;
    }
    for (const m of part.materials ?? []) bumpTextures(m, shift.textures);
    for (const m of part.meshes ?? []) {
      for (const p of m.primitives) {
        p.attributes = Object.fromEntries(Object.entries(p.attributes as Record<string, number>).map(([k, v]) => [k, v + shift.accessors]));
        if (p.indices !== undefined) p.indices += shift.accessors;
        if (p.material !== undefined) p.material += shift.materials;
        for (const t of p.targets ?? []) for (const k of Object.keys(t)) t[k] += shift.accessors;
      }
    }
    for (const key of Object.keys(shift)) doc[key] = [...(doc[key] ?? []), ...(part[key] ?? [])];
    const parentOf = new Map<number, number>();
    (part.nodes as Doc[]).forEach((n, i) => (n.children ?? []).forEach((c: number) => parentOf.set(c, i)));
    (part.nodes as Doc[]).forEach((n, i) => {
      if (n.mesh === undefined) return;
      const node = { ...n, mesh: n.mesh + shift.meshes };
      if (node.skin !== undefined) node.skin = 0;
      delete node.children;
      doc.nodes.push(node);
      const at = doc.nodes.length - 1;
      const parent = parentOf.has(i) ? byName.get(part.nodes[parentOf.get(i)!].name) : undefined;
      if (parent === undefined) doc.scenes[doc.scene ?? 0].nodes.push(at);
      else (doc.nodes[parent].children ??= []).push(at);
    });
  }
  const merged = Buffer.concat(parts);
  doc.buffers = [{ byteLength: merged.length + ((4 - (merged.length % 4)) % 4) }];
  return write(doc, merged);
}
