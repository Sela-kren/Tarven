/**
 * Looks for snaps in the female walk: steps one stride in small pieces and reports, per bone and channel, the biggest
 * jump in speed between neighbouring steps (a kink), against the channel's typical change.
 * Run: ONLY=tools/posepreview/snapcheck.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Body } from "../../src/game/player";
import { stripImages } from "./raster";

test("snap check", async () => {
  const file = readFileSync(join("public", "models", "female.glb"));
  const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
  const body = new Body(gltf.scene, "Female");
  body.setWalkStyle(Number(process.env.STYLE ?? 2));
  const running = Number(process.env.RUN ?? 0);
  const steps = 720;
  const names = ["hips", "torso", "head", "thighL", "thighR", "shinL", "shinR", "upperArmL", "upperArmR", "foreArmL", "foreArmR"];
  const series = new Map<string, number[]>();
  for (let i = 0; i <= steps + 2; i++) {
    body.pose((i / steps) * Math.PI * 2, 1, 0, 0, running);
    for (const n of names) {
      const bone = (body as unknown as Record<string, import("three").Object3D>)[n];
      if (!bone) continue;
      const vals: [string, number][] = [["rx", bone.rotation.x], ["ry", bone.rotation.y], ["rz", bone.rotation.z]];
      if (n === "hips") vals.push(["px", bone.position.x], ["py", bone.position.y], ["pz", bone.position.z]);
      for (const [k, v] of vals) {
        const key = `${n}.${k}`;
        if (!series.has(key)) series.set(key, []);
        series.get(key)!.push(v);
      }
    }
  }
  const rows: string[] = [];
  for (const [key, s] of series) {
    const d1 = s.slice(1).map((v, i) => v - s[i]);
    const d2 = d1.slice(1).map((v, i) => Math.abs(v - d1[i]));
    const range = Math.max(...s) - Math.min(...s);
    const typical = d2.reduce((a, b) => a + b, 0) / d2.length;
    const peak = Math.max(...d2);
    const at = d2.indexOf(peak);
    if (range < 1e-4) continue;
    rows.push(`${key.padEnd(14)} range ${range.toFixed(3)}  kink ${(peak / (typical || 1e-9)).toFixed(1)}x  at ${(at / steps).toFixed(3)}`);
  }
  rows.sort((a, b) => Number(b.split("kink ")[1].split("x")[0]) - Number(a.split("kink ")[1].split("x")[0]));
  const py = series.get("hips.py")!;
  const curve = py.filter((_, i) => i % 18 === 0).map((v, i) => `${((i * 18) / steps).toFixed(3)} ${(v * 100).toFixed(2)}`);
  writeFileSync(process.env.SNAP_OUT ?? "snap.txt", `${series.size} channels\n${rows.join("\n")}\nCURVE\n${curve.join("\n")}`);
});
