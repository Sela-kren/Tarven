/**
 * Checks a packed model (tools/blender/glb_pack.py) against the one it was packed from: both loaded and shaped by the
 * game's own code (unpack.ts, Dresser, her standing pose), every outfit, a few cup sizes, and her points and normals
 * compared where the game draws them. Not a test.
 *
 *   $env:GPC_A="<original.glb>"; $env:GPC_B="<packed.glb>"; npx vitest run -c tools/bridge/glbpackcheck.config.ts
 */
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { Mesh, Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUPS, Dresser, LOOK_OPTIONS, startLook, stopValue, wearOutfit } from "../../src/game/appearance";
import { Body } from "../../src/game/player";
import { softHeft } from "../../src/game/heft";
import { unpackModel } from "../../src/game/unpack";
import { stripImages } from "../posepreview/raster";

async function load(path: string) {
  const model = (await new GLTFLoader().parseAsync(stripImages(readFileSync(path)), "")).scene;
  unpackModel(model);
  const root = model.getObjectByName("Female")!;
  return { model, root, dresser: new Dresser(root, "Female") };
}

function visible(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function sample(model: Object3D) {
  model.updateMatrixWorld(true);
  const out = new Map<string, { p: Float32Array; n: Float32Array }>();
  const v = new Vector3();
  const seen = new Map<string, number>();
  model.traverse((o) => {
    if (!(o instanceof Mesh) || !visible(o)) return;
    const base = o.name;
    const k = seen.get(base) ?? 0;
    seen.set(base, k + 1);
    const pos = o.geometry.getAttribute("position");
    const nor = o.geometry.getAttribute("normal");
    const p = new Float32Array(pos.count * 3);
    const n = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(o.matrixWorld).toArray(p, i * 3);
      if (nor) v.fromBufferAttribute(nor, i).toArray(n, i * 3);
    }
    out.set(`${base}#${k}`, { p, n });
  });
  return out;
}

test("glb pack check", async () => {
  const a = await load(process.env.GPC_A!);
  const b = await load(process.env.GPC_B!);
  const only = process.env.GPC_OUTFITS?.split(",");
  const outfits = LOOK_OPTIONS.Female.outfits.filter((o) => !o.guestOnly && (!only || only.includes(o.id))).map((o) => o.id);
  const worstBy = new Map<string, number>();
  const cups = (process.env.GPC_CUPS ?? "A,F,J,O").split(",");
  let worstP = 0, worstN = 0, sumN = 0, nN = 0, looks = 0;
  for (const outfit of outfits) {
    for (const letter of cups) {
      for (const posed of [false, true]) {
        const look = wearOutfit("Female", startLook("Female"), outfit);
        look.sliders = { ...look.sliders, bust: stopValue(CUPS, CUPS.labels.indexOf(letter)) };
        const shots = [a, b].map((s) => {
          s.dresser.apply(look);
          if (posed) {
            const body = new Body(s.model, "Female");
            s.model.updateMatrixWorld(true);
            body.refreshRest(s.dresser.legSize(), s.dresser.armSpread(), s.dresser.posture(), softHeft(look.sliders));
            for (let f = 0; f < 10; f++) {
              body.advance(1 / 60);
              body.pose(0, 0, 0, 0, 0);
            }
          }
          return sample(s.model);
        });
        for (const [key, x] of shots[0]) {
          const y = shots[1].get(key);
          if (!y || y.p.length !== x.p.length) throw new Error(`${key} differs in shape (${outfit} ${letter})`);
          for (let i = 0; i < x.p.length; i += 3) {
            const d = Math.hypot(x.p[i] - y.p[i], x.p[i + 1] - y.p[i + 1], x.p[i + 2] - y.p[i + 2]);
            worstP = Math.max(worstP, d);
            const label = `${key} ${posed ? "posed" : "standing"}`;
            if (d > (worstBy.get(label) ?? 0)) {
              worstBy.set(label, d);
              if (process.env.GPC_DEBUG && d > 1e-4) console.log(`DEBUG ${label} ${outfit} ${letter} v${i / 3} ${(d * 1000).toFixed(3)} mm`);
            }
            const dot = x.n[i] * y.n[i] + x.n[i + 1] * y.n[i + 1] + x.n[i + 2] * y.n[i + 2];
            const lengths = Math.hypot(x.n[i], x.n[i + 1], x.n[i + 2]) * Math.hypot(y.n[i], y.n[i + 1], y.n[i + 2]);
            if (lengths > 0) {
              const angle = (Math.acos(Math.min(1, Math.max(-1, dot / lengths))) * 180) / Math.PI;
              worstN = Math.max(worstN, angle);
              sumN += angle;
              nN++;
            }
          }
        }
        looks++;
      }
    }
  }
  const top = [...worstBy].sort((p, q) => q[1] - p[1]).slice(0, 8);
  console.log(top.map(([k, d]) => `  ${k}: ${(d * 1000).toFixed(4)} mm`).join(String.fromCharCode(10)));
  console.log(`${looks} looks (${outfits.length} outfits x ${cups.length} cups x standing/posed): points off by at most ${(worstP * 1000).toFixed(4)} mm; normals off by ${(sumN / nN).toFixed(3)} deg on average, at most ${worstN.toFixed(2)} deg`);
}, 3600000);
