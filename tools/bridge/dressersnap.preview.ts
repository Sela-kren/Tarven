/**
 * A fingerprint of everything the Dresser makes of her, to check a change to it makes exactly the same: every outfit
 * (guests' too) at a few cup sizes, dressed and undressed, and for each a checksum of every shown mesh's points and
 * normals as the game draws them. Not a test.
 *
 *   $env:DS_OUT="<snap.json>"; npx vitest run -c tools/bridge/dressersnap.config.ts      (write a fingerprint)
 *   $env:DS_CMP="<snap.json>"; npx vitest run -c tools/bridge/dressersnap.config.ts      (compare with one)
 *
 * DS_MODEL reads another model (default public/models/female.glb, with its outfit files: outfitfiles.ts).
 * DS_LATE=1 loads the outfits after the Dresser is made (Dresser.addMeshes), as the game does; DS_LATE=2 dresses her
 * first, then loads them.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { Mesh, Object3D, SkinnedMesh, Vector3 } from "three";
import { CUPS, Dresser, LOOK_OPTIONS, startLook, stopValue, wearOutfit } from "../../src/game/appearance";
import { loadCharacterNode } from "./loadcharacter";

function visible(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function fingerprint(model: Object3D): Record<string, [number, number, number]> {
  model.updateMatrixWorld(true);
  const out: Record<string, [number, number, number]> = {};
  const v = new Vector3();
  const seen = new Map<string, number>();
  model.traverse((o) => {
    if (!(o instanceof Mesh) || !visible(o)) return;
    const k = seen.get(o.name) ?? 0;
    seen.set(o.name, k + 1);
    const pos = o.geometry.getAttribute("position");
    const nor = o.geometry.getAttribute("normal");
    let a = 0, b = 0, c = 0;
    for (let i = 0; i < pos.count; i++) {
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(o.matrixWorld);
      const w = 1 + (i % 97) / 97;
      a += (v.x * 3 + v.y * 5 + v.z * 7) * w;
      if (nor) {
        v.fromBufferAttribute(nor, i);
        b += (v.x * 3 + v.y * 5 + v.z * 7) * w;
      }
    }
    c = pos.count;
    out[`${o.name}#${k}`] = [a, b, c];
  });
  return out;
}

test("dresser fingerprint", async () => {
  const late = process.env.DS_LATE === "1" || process.env.DS_LATE === "2";
  const loaded = await loadCharacterNode("Female", process.env.DS_MODEL, { late });
  const { model, dresser } = loaded;
  // DS_LATE=2: dressed before the outfits come, as in the game (they're fitted to her and her look put on again).
  if (process.env.DS_LATE === "2") dresser.apply(startLook("Female"));
  if (late) await loaded.addAll();
  const cups = (process.env.DS_CUPS ?? "A,J").split(",");
  const snap: Record<string, Record<string, [number, number, number]>> = {};
  for (const outfit of LOOK_OPTIONS.Female.outfits) {
    for (const letter of cups) {
      for (const nude of [false, true]) {
        if (nude && letter !== cups[0]) continue;
        const look = wearOutfit("Female", startLook("Female"), outfit.id);
        look.sliders = { ...look.sliders, bust: stopValue(CUPS, CUPS.labels.indexOf(letter)) };
        dresser.setUndressed(false);
        dresser.apply(look);
        if (nude) dresser.setUndressed(true);
        snap[`${outfit.id} ${letter}${nude ? " nude" : ""}`] = fingerprint(model);
      }
    }
  }
  if (process.env.DS_OUT) {
    writeFileSync(process.env.DS_OUT, JSON.stringify(snap));
    console.log(`fingerprint: ${Object.keys(snap).length} looks -> ${process.env.DS_OUT}`);
  }
  if (process.env.DS_CMP) {
    const old = JSON.parse(readFileSync(process.env.DS_CMP, "utf8")) as typeof snap;
    let differ = 0, worst = 0;
    const notes: string[] = [];
    for (const [look, meshes] of Object.entries(old)) {
      const now = snap[look];
      if (!now) { notes.push(`${look}: missing`); differ++; continue; }
      const keys = new Set([...Object.keys(meshes), ...Object.keys(now)]);
      for (const key of keys) {
        const a = meshes[key], b = now[key];
        if (!a || !b) { notes.push(`${look}: ${key} ${a ? "no longer shown" : "newly shown"}`); differ++; continue; }
        const d = Math.max(...a.map((x, i) => Math.abs(x - b[i]) / Math.max(1, Math.abs(x))));
        worst = Math.max(worst, d);
        if (d > 1e-9) { notes.push(`${look}: ${key} off ${d.toExponential(2)}`); differ++; }
      }
    }
    console.log(notes.slice(0, 30).join("\n"));
    console.log(`compare: ${Object.keys(old).length} looks, ${differ} differences, worst relative ${worst.toExponential(2)}`);
  }
}, 3600000);
