/**
 * Looks for stretched shoe triangles: poses her through the walk and run (player.ts Body), skins every shoe mesh as
 * three.js does (SkinnedMesh.getVertexPosition), and reports edges much longer than at rest, with the bones their
 * points hang from. Writes a report to SHOE_OUT (default shoestretch.txt).
 *   ONLY=tools/posepreview/shoestretch.preview.ts npx vitest run --config tools/posepreview/vitest.config.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Body } from "../../src/game/player";
import { unpackModel } from "../../src/game/unpack";
import { stripImages } from "./raster";

test("shoe stretch", async () => {
  const file = readFileSync(join("public", "models", "female.glb"));
  const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
  unpackModel(gltf.scene);
  const body = new Body(gltf.scene, "Female");
  body.setWalkStyle(2);
  const shoes: SkinnedMesh[] = [];
  gltf.scene.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh && /Shoes/.test(o.name)) shoes.push(o as SkinnedMesh);
  });
  const lines: string[] = [`${shoes.length} shoe meshes`];
  const p = new Vector3(), q = new Vector3();
  // Rest lengths of every edge.
  const rest = new Map<SkinnedMesh, Float32Array>();
  body.pose(0, 0, 0, 0, 0);
  gltf.scene.updateMatrixWorld(true);
  const edgesOf = (mesh: SkinnedMesh) => {
    const index = mesh.geometry.index!;
    const edges: [number, number][] = [];
    for (let t = 0; t < index.count; t += 3) {
      const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
      edges.push([a, b], [b, c], [c, a]);
    }
    return edges;
  };
  const lengths = (mesh: SkinnedMesh, edges: [number, number][]) => {
    mesh.skeleton.update();
    const out = new Float32Array(edges.length);
    edges.forEach(([a, b], i) => {
      mesh.getVertexPosition(a, p);
      mesh.getVertexPosition(b, q);
      out[i] = p.distanceTo(q);
    });
    return out;
  };
  const edges = new Map(shoes.map((m) => [m, edgesOf(m)]));
  for (const m of shoes) rest.set(m, lengths(m, edges.get(m)!));
  for (const [gait, running] of [["walk", 0], ["run", 1]] as const) {
    for (let i = 0; i < 8; i++) {
      body.pose((i / 8) * Math.PI * 2, 1, 0, 0, running);
      gltf.scene.updateMatrixWorld(true);
      for (const m of shoes) {
        const now = lengths(m, edges.get(m)!);
        const before = rest.get(m)!;
        let worst = 0, worstAt = -1;
        for (let e = 0; e < now.length; e++) {
          const grow = now[e] - before[e];
          if (grow > worst) { worst = grow; worstAt = e; }
        }
        if (worst > 0.01) {
          const [a, b] = edges.get(m)![worstAt];
          const si = m.geometry.getAttribute("skinIndex"), sw = m.geometry.getAttribute("skinWeight");
          const bonesOf = (v: number) => [0, 1, 2, 3].filter((k) => sw.getComponent(v, k) > 0).map((k) => `${m.skeleton.bones[si.getComponent(v, k)].name}:${sw.getComponent(v, k).toFixed(2)}`).join(" ");
          const pos = m.geometry.getAttribute("position");
          const at = (v: number) => `(${[pos.getX(v), pos.getY(v), pos.getZ(v)].map((x) => x.toFixed(3)).join(", ")})`;
          const material = Array.isArray(m.material) ? "multi" : m.material.name;
          lines.push(`${gait} ${i} ${m.name} [${material}]: edge grows ${(worst * 100).toFixed(1)} cm (rest ${(before[worstAt] * 100).toFixed(1)} cm); ${a} ${at(a)} on ${bonesOf(a)} | ${b} ${at(b)} on ${bonesOf(b)}`);
        }
      }
    }
  }
  writeFileSync(process.env.SHOE_OUT ?? "shoestretch.txt", lines.join("\n"));
});
