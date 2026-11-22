/**
 * Checks her vulva's and anus's shape keys (public/models/female_crotch.json) on the model as the game shapes her:
 * every key point found on her meshes, and how far each key, and each mix the customizer's preview shows, moves her
 * vulva's and anus's meshes from closed (largest and mean, in mm).
 *
 *   npx vitest run -c tools/bridge/crotchkeyscheck.config.ts
 *
 * CKC_KEYS reads another keys file; CKC_MODEL another GLB.
 */
import { readFileSync } from "node:fs";
import { expect, test, vi } from "vitest";
import { Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Dresser, LOOK_OPTIONS, startLook } from "../../src/game/appearance";
import { setCrotchKeys } from "../../src/game/crotchkeys";
import type { FaceKeysFile } from "../../src/game/facekeys";
import { unpackModel } from "../../src/game/unpack";
import { stripImages } from "../posepreview/raster";

test("crotch keys check", async () => {
  setCrotchKeys("Female", JSON.parse(readFileSync(process.env.CKC_KEYS ?? "public/models/female_crotch.json", "utf8")) as FaceKeysFile);
  const model = (await new GLTFLoader().parseAsync(stripImages(readFileSync(process.env.CKC_MODEL ?? "public/models/female.glb")), "")).scene;
  unpackModel(model);
  const root = model.getObjectByName("Female")!;
  const warn = vi.spyOn(console, "warn");
  const dresser = new Dresser(root, "Female");
  const missing = warn.mock.calls.filter((c) => String(c[0]).startsWith("crotch keys"));
  for (const call of missing) console.log("MISSING", call[0]);
  const look = startLook("Female");
  look.sliders = Object.fromEntries(LOOK_OPTIONS.Female.sliders.map((s) => [s.id, 0]));
  dresser.apply(look);
  dresser.setDressing("nude");
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh && /^T_(vulva|labia|canal|anus|anus_skin)$/.test((o.material as { name: string }).name)) meshes.push(o);
  });
  const snap = () => meshes.map((m) => Float32Array.from(m.geometry.getAttribute("position").array as ArrayLike<number>));
  const closed = snap();
  const none = { close: 0, left: 0, right: 0 };
  const states: [string, [number, number], Parameters<Dresser["setHold"]>[0]][] = [
    ["vulva open", [1, 0], {}], ["vulva stretched", [2, 0], {}], ["vulva clench", [0, 0], { vulva: { close: 1 } }],
    ["vulva left hand", [0, 0], { vulva: { left: 1 } }], ["vulva both hands", [0, 0], { vulva: { left: 1, right: 1 } }],
    ["anus open", [0, 1], {}], ["anus clench", [0, 0], { anus: { close: 1 } }], ["anus both hands", [0, 0], { anus: { left: 1, right: 1 } }],
  ];
  for (const [label, [v, a], holds] of states) {
    dresser.setOpening(v, a);
    dresser.setHold(holds);
    const now = snap();
    let max = 0, sum = 0, n = 0;
    now.forEach((p, m) => {
      for (let i = 0; i < p.length; i += 3) {
        const d = Math.hypot(p[i] - closed[m][i], p[i + 1] - closed[m][i + 1], p[i + 2] - closed[m][i + 2]);
        if (d > 1e-6) { max = Math.max(max, d); sum += d; n++; }
      }
    });
    console.log(`${label}: ${n} points moved, largest ${(max * 1000).toFixed(1)} mm, mean ${(n ? (sum / n) * 1000 : 0).toFixed(2)} mm`);
    dresser.setOpening(0, 0);
    dresser.setHold({ vulva: none, anus: none });
  }
  expect(missing.length).toBe(0);
}, 1800000);
