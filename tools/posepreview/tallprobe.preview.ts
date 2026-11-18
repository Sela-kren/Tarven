/**
 * TEMPORARY (scene men 1.1x pass): measures every scene's contacts. MAN_SCALE overrides SCENE_MAN_SCALE (1 = before).
 * Writes tallprobe.json to POSE_OUT. RENDER=1 also renders each scene's own camera (+ YAWS extra angles).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Box3, BoxGeometry, Mesh, PerspectiveCamera, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { poseBones } from "../../src/game/battlepose";
import { Dresser, newLook } from "../../src/game/appearance";
import { placeBody, SCENE_JOINS, SCENE_MAN_SCALE, SCENE_POSE_LIST, SCENE_POSES, sceneFraming, type Posed, type ScenePoseName } from "../../src/game/sexpose";
import { makeProps, makeTable } from "../../src/game/scenetable";
import { colourOf, drawAll, H, stripImages, W } from "./raster";

type P = Posed & { name: string };
const MAN = Number(process.env.MAN_SCALE ?? SCENE_MAN_SCALE);

async function load(file: string, name: "Female" | "Male"): Promise<P> {
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(join("public", "models", file))), "");
  const model = gltf.scene;
  const root = model.getObjectByName(name) ?? model;
  const dresser = new Dresser(root, name);
  dresser.apply(newLook());
  dresser.setDressing("nude");
  if (name === "Male") dresser.setErection(1);
  model.traverse((o) => {
    if (o instanceof Mesh) o.visible = o.visible && colourOf(o, name) !== null;
  });
  if (name === "Male") model.scale.setScalar(MAN);
  const bones = poseBones(model, name);
  const hipsBaseY = bones.hips?.position.y ?? 0;
  return { name, model, bones, female: name === "Female", hipsBaseY, hipsBaseZ: bones.hips?.position.z ?? 0, legLength: hipsBaseY + (bones.thighL?.position.y ?? 0), scale: 1 };
}

function verts(model: Object3D, re: RegExp, step = 1): Vector3[] {
  const out: Vector3[] = [];
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof Mesh) || /Outline/.test(o.name)) return;
    for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!re.test(mat.name) && !re.test(o.name)) return;
    const pos = o.geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i += step) {
      const v = new Vector3();
      if (o instanceof SkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(o.matrixWorld);
      out.push(v);
    }
  });
  return out;
}
const centroid = (vs: Vector3[]) => (vs.length ? vs.reduce((c, v) => c.add(v), new Vector3()).multiplyScalar(1 / vs.length) : null);
const bone = (model: Object3D, re: RegExp) => {
  let b: Object3D | null = null;
  model.traverse((o) => {
    if (!b && !(o instanceof Mesh) && re.test(o.name)) b = o;
  });
  return b ? (b as Object3D).getWorldPosition(new Vector3()) : null;
};
const near = (p: Vector3 | null, vs: Vector3[]) => (p && vs.length ? Math.min(...vs.map((v) => v.distanceTo(p))) : null);
const r3 = (n: number | null) => (n === null ? null : +n.toFixed(3));
const rv = (v: Vector3 | null) => (v ? [v.x, v.y, v.z].map((n) => +n.toFixed(3)) : null);

function tip(model: Object3D): Vector3 | null {
  const gl = verts(model, /^T_glans$/);
  const sc = centroid(verts(model, /^T_scrotum$/));
  if (!gl.length || !sc) return null;
  let best = gl[0];
  let d = -1;
  for (const v of gl) {
    const e = v.distanceTo(sc);
    if (e > d) {
      d = e;
      best = v;
    }
  }
  return best;
}

test("tall probe", async () => {
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out");
  mkdirSync(out, { recursive: true });
  const her = await load("female.glb", "Female");
  const him = await load("male.glb", "Male");
  const others = [await load("male.glb", "Male"), await load("male.glb", "Male"), await load("male.glb", "Male")];
  const names = (process.env.SCENES ? process.env.SCENES.split(",") : SCENE_POSE_LIST) as ScenePoseName[];
  const yaws = (process.env.YAWS ?? "0").split(",").map(Number);
  const report: Record<string, unknown> = {};
  const index: { pose: string; file: string }[] = [];
  for (const name of names) {
    const scene = SCENE_POSES[name];
    const joins = process.env.ALONE === "1" ? [] : (SCENE_JOINS[name] ?? []).slice(0, others.length);
    let herBody = scene.her.body;
    for (const spot of joins) herBody = { ...herBody, ...spot.reach };
    placeBody(her, herBody, scene.her.place);
    const men: { label: string; p: P }[] = [];
    if (scene.them) {
      placeBody(him, scene.them.body, scene.them.place);
      men.push({ label: "lead", p: him });
    }
    joins.forEach((spot, i) => {
      placeBody(others[i], spot.body, spot.place);
      men.push({ label: spot.slot, p: others[i] });
    });
    const hm = her.model;
    const herSkin = verts(hm, /^T_skin/, 3);
    const mouth = centroid(verts(hm, /^T_lip$/));
    const vulva = centroid(verts(hm, /^T_vulva$/));
    const anus = centroid(verts(hm, /^T_anus$/));
    const hl = bone(hm, /HandTips_L/);
    const hr = bone(hm, /HandTips_R/);
    const herHead = bone(hm, /Female_Head$/);
    const herAll = verts(hm, /./, 4);
    const entry: Record<string, unknown> = { herMinY: r3(Math.min(...herAll.map((v) => v.y))), herHead: rv(herHead) };
    const allMenSkin = men.map((m) => verts(m.p.model, /^T_skin/, 3));
    entry.herHandL_men = r3(Math.min(...allMenSkin.map((s) => near(hl, s) ?? 9)));
    entry.herHandR_men = r3(Math.min(...allMenSkin.map((s) => near(hr, s) ?? 9)));
    entry.men = men.map(({ label, p }) => {
      const t = tip(p.model);
      const all = verts(p.model, /./, 4);
      const head = bone(p.model, /Male_Head$/);
      const mhl = bone(p.model, /HandTips_L/);
      const mhr = bone(p.model, /HandTips_R/);
      const footL = bone(p.model, /Male_Foot_L|Male_Toe_L/);
      const kneeL = p.bones.shinL?.getWorldPosition(new Vector3()) ?? null;
      const kneeR = p.bones.shinR?.getWorldPosition(new Vector3()) ?? null;
      return {
        label,
        minY: r3(Math.min(...all.map((v) => v.y))),
        head: rv(head),
        headAboveHers: head && herHead ? r3(head.y - herHead.y) : null,
        tip: rv(t),
        toMouth: r3(t && mouth ? t.distanceTo(mouth) : null),
        toVulva: r3(t && vulva ? t.distanceTo(vulva) : null),
        toAnus: r3(t && anus ? t.distanceTo(anus) : null),
        toHandL: r3(t && hl ? t.distanceTo(hl) : null),
        toHandR: r3(t && hr ? t.distanceTo(hr) : null),
        handL_her: r3(near(mhl, herSkin)),
        handR_her: r3(near(mhr, herSkin)),
        handL: rv(mhl),
        handR: rv(mhr),
        kneeL: rv(kneeL),
        kneeR: rv(kneeR),
        footL: rv(footL),
      };
    });
    report[name] = entry;
    if (process.env.RENDER === "1") {
      const items: { model: Object3D; name: string }[] = [{ model: hm, name: "Female" }, ...men.map((m) => ({ model: m.p.model, name: "Male" }))];
      const box = new Box3();
      for (const { model } of items) box.union(new Box3().setFromObject(model, true));
      if (scene.table) items.push({ model: makeTable(scene.table), name: "Table" });
      for (const prop of makeProps(scene.props ?? [])) items.push({ model: prop, name: "Table" });
      const floor = new Mesh(new BoxGeometry(4, 0.02, 4));
      floor.name = "Floor_Shoes";
      floor.position.y = -0.01;
      items.push({ model: floor, name: "Floor" });
      yaws.forEach((y, k) => {
        const camera = new PerspectiveCamera(scene.view.fov ?? 28, W / H, 0.05, 30);
        const view = k === 0 ? scene.view : { yaw: scene.view.yaw + y, pitch: 0.05 };
        const frame = sceneFraming(box, view, camera.fov, W / H);
        camera.position.copy(frame.position);
        camera.lookAt(frame.target);
        camera.updateProjectionMatrix();
        const file = `scene_${name}_${k}.rgba`;
        writeFileSync(join(out, file), drawAll(items, camera));
        index.push({ pose: name, file });
      });
    }
  }
  writeFileSync(join(out, "index_scenes.json"), JSON.stringify({ w: W, h: H, items: index }));
  writeFileSync(join(out, "tallprobe.json"), JSON.stringify(report, null, 1));
});
