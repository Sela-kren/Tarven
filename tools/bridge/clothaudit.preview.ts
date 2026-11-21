// TEMPORARY (2026-11-21): which outfits sink into her skin at which cups, with the sculpted cup keys.
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, LOOK_OPTIONS, startLook, stopValue, wearOutfit } from "../../src/game/appearance";
import { stripImages } from "../posepreview/raster";
const CUPS_TO_CHECK = "ABCDEFGHIJKLMNO".split("");
function visible(o: Object3D): boolean { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; }
test("audit", async () => {
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync("public/models/female.glb")), "");
  const model = gltf.scene; const root = model.getObjectByName("Female")!;
  const dresser = new Dresser(root, "Female");
  const rows: string[] = [];
  const outfits = LOOK_OPTIONS.Female.outfits.filter((o) => o.id === (process.env.OUTFIT ?? "tee"));
  for (const outfit of outfits) {
    const cells: string[] = [];
    for (const letter of CUPS_TO_CHECK) {
      const look = wearOutfit("Female", startLook("Female"), outfit.id);
      look.sliders = { ...look.sliders, bust: stopValue(CUPS, CUPS.labels.indexOf(letter)) };
      dresser.setUndressed(false); dresser.apply(look);
      model.updateMatrixWorld(true);
      const v = new Vector3();
      // her skin: points and normals as she is now
      const bp: number[] = []; const bn: number[] = [];
      const cloth: number[] = [];
      model.traverse((o) => {
        if (!(o instanceof SkinnedMesh) || !visible(o)) return;
        const isBody = /^Female_Body(_\d+)?$/.test(o.name); const isCloth = o.name.startsWith("Female_Cloth");
        if (!isBody && !isCloth) return;
        o.skeleton.update();
        const pos = o.geometry.getAttribute("position");
        const world: Vector3[] = [];
        for (let i = 0; i < pos.count; i++) { o.applyBoneTransform(i, v.fromBufferAttribute(pos, i)); world.push(v.clone().applyMatrix4(o.matrixWorld)); }
        if (isCloth) { for (const p of world) cloth.push(p.x, p.y, p.z); return; }
        const nrm = world.map(() => new Vector3());
        const idx = o.geometry.index!;
        for (let t = 0; t < idx.count; t += 3) {
          const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
          const n = new Vector3().subVectors(world[b], world[a]).cross(new Vector3().subVectors(world[c], world[a]));
          nrm[a].add(n); nrm[b].add(n); nrm[c].add(n);
        }
        world.forEach((p, i) => { const n = nrm[i].normalize(); bp.push(p.x, p.y, p.z); bn.push(n.x, n.y, n.z); });
      });
      const cell = 0.01; const grid = new Map<string, number[]>();
      const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
      for (let i = 0; i < bp.length / 3; i++) { const k = key(bp[i * 3], bp[i * 3 + 1], bp[i * 3 + 2]); (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); }
      let inside = 0, worst = 0; const torso = [0, 0]; const where: string[] = [];
      for (let j = 0; j < cloth.length / 3; j++) {
        const x = cloth[j * 3], y = cloth[j * 3 + 1], z = cloth[j * 3 + 2];
        let best = -1, bd = 1e9;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          for (const i of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            const d = (bp[i * 3] - x) ** 2 + (bp[i * 3 + 1] - y) ** 2 + (bp[i * 3 + 2] - z) ** 2;
            if (d < bd) { bd = d; best = i; }
          }
        }
        if (best < 0) continue;
        const depth = (x - bp[best * 3]) * bn[best * 3] + (y - bp[best * 3 + 1]) * bn[best * 3 + 1] + (z - bp[best * 3 + 2]) * bn[best * 3 + 2];
        if (depth < -0.002) { inside++; worst = Math.min(worst, depth); if (y > 1.05 && y < 1.45) { torso[0]++; torso[1] = Math.min(torso[1], depth); } else if (where.length < 3) where.push(`${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`); }
      }
      cells.push(`${letter}: chest ${torso[0]}${torso[0] ? `(${(-torso[1] * 1000).toFixed(0)}mm)` : ""} other ${inside - torso[0]} ${where.slice(0, 2).join(" ")}`);
    }
    rows.push([outfit.id, ...cells.map((c) => "  " + c)].join(String.fromCharCode(10)));
    console.log(rows[rows.length - 1]);
  }
  writeFileSync("ref/_bridge/clothaudit.txt", rows.join("\n"));
});
