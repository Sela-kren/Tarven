/**
 * TEMPORARY (scene men 1.1x pass): for each man in each scene (SCENES), finds the pose numbers that put the man,
 * drawn SCENE_MAN_SCALE big, back on the contacts he had at his old size: his tip where it was, the hands that held
 * her (or a prop) where they were, his feet/knees/seat on whatever they stood on, her hands still on him.
 * Writes tallsolve.json (the new numbers and the gaps before/after) to POSE_OUT.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { poseBones } from "../../src/game/battlepose";
import { Dresser, newLook } from "../../src/game/appearance";
import { placeBody, SCENE_JOINS, SCENE_MAN_SCALE, SCENE_POSE_LIST, SCENE_POSES, type Body, type Place, type Posed, type ScenePoseName } from "../../src/game/sexpose";
import { colourOf, stripImages } from "./raster";

type P = Posed & { name: string; groups: Groups };
interface VRef { mesh: SkinnedMesh; i: number }
interface Groups { glans: VRef[]; scrotum: VRef[]; legL: VRef[]; legR: VRef[]; seat: VRef[]; all: VRef[]; skin: VRef[]; handL: Object3D; handR: Object3D }

async function load(file: string, name: "Female" | "Male", scale: number): Promise<P> {
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
  model.scale.setScalar(scale);
  const bones = poseBones(model, name);
  const hipsBaseY = bones.hips?.position.y ?? 0;
  const g: Groups = { glans: [], scrotum: [], legL: [], legR: [], seat: [], all: [], skin: [], handL: model.getObjectByName(`${name}_HandTips_L`)!, handR: model.getObjectByName(`${name}_HandTips_R`)! };
  model.traverse((o) => {
    if (!(o instanceof SkinnedMesh) || /Outline/.test(o.name)) return;
    for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const sk = o.geometry.attributes.skinIndex;
    const sw = o.geometry.attributes.skinWeight;
    const n = o.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) {
      const ref = { mesh: o, i };
      if (mat.name === "T_glans") g.glans.push(ref);
      if (mat.name === "T_scrotum") g.scrotum.push(ref);
      let best = 0;
      for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
      const bone = o.skeleton.bones[sk.getComponent(i, best)].name;
      if (i % 3 === 0) {
        if (/Thigh_L|Shin_L|Foot_L|Toe_L/.test(bone)) g.legL.push(ref);
        if (/Thigh_R|Shin_R|Foot_R|Toe_R/.test(bone)) g.legR.push(ref);
        if (/Hips|Glute/.test(bone)) g.seat.push(ref);
      }
      if (i % 5 === 0) g.all.push(ref);
      if (/^T_skin/.test(mat.name) && i % 3 === 0) g.skin.push(ref);
    }
  });
  return { name, model, bones, female: name === "Female", hipsBaseY, hipsBaseZ: bones.hips?.position.z ?? 0, legLength: hipsBaseY + (bones.thighL?.position.y ?? 0), scale: 1, groups: g };
}

const pos = (refs: VRef[]) =>
  refs.map(({ mesh, i }) => {
    const v = new Vector3();
    mesh.getVertexPosition(i, v);
    return v.applyMatrix4(mesh.matrixWorld);
  });
const centroid = (vs: Vector3[]) => vs.reduce((c, v) => c.add(v), new Vector3()).multiplyScalar(1 / vs.length);
const near = (p: Vector3, vs: Vector3[]) => Math.min(...vs.map((v) => v.distanceTo(p)));
const minY = (vs: Vector3[]) => (vs.length ? vs.reduce((m, v) => (v.y < m.y ? v : m), vs[0]) : null);

function tipOf(p: P): Vector3 {
  const gl = pos(p.groups.glans);
  const sc = centroid(pos(p.groups.scrotum));
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

interface Measure { tip: Vector3; handL: Vector3; handR: Vector3; lows: Record<string, Vector3 | null>; head: Vector3 }
function measure(p: P): Measure {
  p.model.updateMatrixWorld(true);
  return {
    tip: tipOf(p),
    handL: p.groups.handL.getWorldPosition(new Vector3()),
    handR: p.groups.handR.getWorldPosition(new Vector3()),
    lows: { legL: minY(pos(p.groups.legL)), legR: minY(pos(p.groups.legR)), seat: minY(pos(p.groups.seat)), all: minY(pos(p.groups.all)) },
    head: p.bones.head!.getWorldPosition(new Vector3()),
  };
}

/** Distance from a point to an axis-aligned box. */
function boxDist(p: Vector3, min: Vector3, max: Vector3): number {
  const dx = Math.max(min.x - p.x, 0, p.x - max.x);
  const dy = Math.max(min.y - p.y, 0, p.y - max.y);
  const dz = Math.max(min.z - p.z, 0, p.z - max.z);
  return Math.hypot(dx, dy, dz);
}

function search(f: (x: number[]) => number, x0: number[], steps: number[], minScale = 0.02): number[] {
  let x = x0.slice();
  let fx = f(x);
  let s = 1;
  let guard = 0;
  while (s > minScale && guard++ < 400) {
    let improved = false;
    for (let i = 0; i < x.length; i++) {
      if (!steps[i]) continue;
      for (const sign of [1, -1]) {
        const y = x.slice();
        y[i] += sign * steps[i] * s;
        const fy = f(y);
        if (fy < fx) {
          x = y;
          fx = fy;
          improved = true;
          break;
        }
      }
    }
    if (!improved) s /= 2;
  }
  return x;
}

/** Nelder-Mead over the free parameters (those with a step), restarted, then the pattern search to finish. */
function solve(f: (x: number[]) => number, x0: number[], steps: number[]): number[] {
  const free = steps.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  if (!free.length) return x0;
  const full = (y: number[]) => {
    const x = x0.slice();
    free.forEach((i, k) => (x[i] = y[k]));
    return x;
  };
  const g = (y: number[]) => f(full(y));
  let best = free.map((i) => x0[i]);
  for (let restart = 0; restart < 4; restart++) {
    const n = best.length;
    let simplex = [best, ...free.map((i, k) => best.map((v, j) => (j === k ? v + steps[i] * 2 : v)))].map((x) => ({ x, f: g(x) }));
    for (let it = 0; it < 600; it++) {
      simplex.sort((a, b) => a.f - b.f);
      const c = new Array(n).fill(0);
      for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) c[j] += simplex[k].x[j] / n;
      const worst = simplex[n];
      const at = (t: number) => c.map((v, j) => v + t * (worst.x[j] - v));
      const xr = at(-1);
      const fr = g(xr);
      if (fr < simplex[0].f) {
        const xe = at(-2);
        const fe = g(xe);
        simplex[n] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
      } else if (fr < simplex[n - 1].f) simplex[n] = { x: xr, f: fr };
      else {
        const xc = at(0.5);
        const fc = g(xc);
        if (fc < worst.f) simplex[n] = { x: xc, f: fc };
        else simplex = simplex.map((p, k) => (k === 0 ? p : { x: p.x.map((v, j) => simplex[0].x[j] + 0.5 * (v - simplex[0].x[j])), f: 0 })).map((p, k) => (k === 0 ? p : { x: p.x, f: g(p.x) }));
      }
      if (Math.abs(simplex[n].f - simplex[0].f) < 1e-9 && it > 50) break;
    }
    simplex.sort((a, b) => a.f - b.f);
    best = simplex[0].x;
  }
  return search(f, full(best), steps.map((s) => s * 0.25));
}

const r = (n: number, d = 3) => +n.toFixed(d);

test("tall solve", async () => {
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out");
  mkdirSync(out, { recursive: true });
  const her = await load("female.glb", "Female", 1);
  const small = await load("male.glb", "Male", 1);
  const big = await load("male.glb", "Male", Number(process.env.MAN_SCALE ?? SCENE_MAN_SCALE));
  const names = (process.env.SCENES ? process.env.SCENES.split(",") : SCENE_POSE_LIST) as ScenePoseName[];
  const result: Record<string, unknown[]> = {};
  for (const name of names) {
    const scene = SCENE_POSES[name];
    const joins = SCENE_JOINS[name] ?? [];
    // Each man is solved with her as she is with all the joins in (their reach), the way the game draws a full scene.
    let herBody = scene.her.body;
    for (const spot of joins) herBody = { ...herBody, ...spot.reach };
    placeBody(her, herBody, scene.her.place);
    her.model.updateMatrixWorld(true);
    const herSkin = pos(her.groups.skin);
    const herAll = pos(her.groups.all);
    const herHL = her.groups.handL.getWorldPosition(new Vector3());
    const herHR = her.groups.handR.getWorldPosition(new Vector3());
    const supports = [0, ...(scene.table ? [scene.table.height] : []), ...(scene.props ?? []).map((p) => p.height)];
    const propBoxes = [...(scene.table ? [{ x: scene.table.x, z: scene.table.z, length: scene.table.length, width: scene.table.width, height: scene.table.height }] : []), ...(scene.props ?? [])].map(
      (p) => [new Vector3(p.x - p.length / 2, 0, p.z - p.width / 2), new Vector3(p.x + p.length / 2, p.height, p.z + p.width / 2)] as const,
    );
    const men: { label: string; body: Body; place: Place }[] = [];
    if (scene.them) men.push({ label: "lead", body: scene.them.body, place: scene.them.place });
    joins.forEach((spot, i) => men.push({ label: `${spot.slot}#${i}`, body: spot.body, place: spot.place }));
    result[name] = [];
    const env = (key: string) => Object.fromEntries((process.env[key] ?? "").split(",").filter(Boolean).map((kv) => kv.split("=")));
    const tips = env("TIPS");
    const herDy = Number(env("HER_DY")[name] ?? 0);
    const seats = (process.env.SEAT ?? "").split(",");
    const holdOff = (process.env.NO_HOLD ?? "").split(",");
    const herVerts = (re: RegExp) => {
      const found: Vector3[] = [];
      her.model.traverse((o) => {
        if (!(o instanceof SkinnedMesh) || !o.visible) return;
        const mat = Array.isArray(o.material) ? o.material[0] : o.material;
        if (!re.test(mat.name)) return;
        for (let i = 0; i < o.geometry.attributes.position.count; i++) found.push(o.getVertexPosition(i, new Vector3()).applyMatrix4(o.matrixWorld));
      });
      return found.length ? centroid(found) : null;
    };
    const holes: Record<string, Vector3 | null> = { mouth: herVerts(/^T_lip$/), vulva: herVerts(/^T_vulva$/), anus: herVerts(/^T_anus$/) };
    const dy = new Vector3(0, herDy, 0);
    for (const [mi, man] of men.entries()) {
      placeBody(small, man.body, man.place);
      const old = measure(small);
      old.tip.add(dy);
      old.handL.add(dy);
      old.handR.add(dy);
      const oldSeat = centroid(pos(small.groups.seat)).add(dy);
      const oldSkin = pos(small.groups.skin).map((v) => v.add(dy));
      const herOnHim = { L: near(herHL, oldSkin), R: near(herHR, oldSkin) };
      const handTo = (h: Vector3) => Math.min(near(h, herSkin), ...propBoxes.map(([a, b]) => boxDist(h, a, b)));
      const holds = { L: handTo(old.handL) < 0.06 && !holdOff.includes(`${name}:${man.label}:L`), R: handTo(old.handR) < 0.06 && !holdOff.includes(`${name}:${man.label}:R`) };
      const supported = Object.fromEntries(
        Object.entries(old.lows).map(([k, v]) => [k, v && supports.some((h) => Math.abs(v.y - h) < 0.035) ? v : null]),
      ) as Record<string, Vector3 | null>;
      // His tip is held where it was if it was at her (her mouth, in her, in her hand); or as TIPS says.
      const atHer = Math.min(...[holes.mouth, holes.vulva, holes.anus, herHL, herHR].filter((v): v is Vector3 => !!v).map((v) => v.distanceTo(old.tip)));
      const mode = tips[`${name}:${man.label}`] ?? (atHer < 0.12 ? "old" : "free");
      const tipTarget = mode === "old" ? old.tip : mode in holes ? holes[mode] : null;
      const lying = Math.abs(man.place.pitch) > 0.5;
      const pl = man.place;
      const bd = man.body;
      // Stage 1: where he is and how his legs and back are, for his tip, his footing, and her hands on him.
      const x0 = [pl.x, pl.y, pl.z, bd.drop, bd.legL.x, bd.legL.knee, bd.legR.x, bd.legR.knee, bd.torso[0], bd.legL.out, bd.legR.out];
      const fixY = (process.env.FIX_Y ?? "").split(",").includes(`${name}:${man.label}`);
      const steps = lying
        ? [0.03, 0.02, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]
        : [0.03, pl.y !== 0 && !fixY ? 0.02 : 0, 0.03, 0.03, 0.08, 0.08, 0.08, 0.08, 0.06, 0.04, 0.04];
      const make = (x: number[], arms?: number[]) => {
        const body: Body = {
          ...bd,
          drop: x[3],
          torso: [x[8], bd.torso[1], bd.torso[2]],
          legL: { ...bd.legL, x: x[4], knee: x[5], out: x[9] },
          legR: { ...bd.legR, x: x[6], knee: x[7], out: x[10] },
          armL: arms ? { ...bd.armL, x: arms[0], out: arms[1], elbow: arms[2], y: arms[3] } : bd.armL,
          armR: arms ? { ...bd.armR, x: arms[4], out: arms[5], elbow: arms[6], y: arms[7] } : bd.armR,
        };
        const place: Place = { ...pl, x: x[0], y: x[1], z: x[2] };
        return { body, place };
      };
      const seatHeld = seats.includes(`${name}:${man.label}`);
      const cost1 = (x: number[]) => {
        const { body, place } = make(x);
        placeBody(big, body, place);
        const m = measure(big);
        let c = 0;
        if (tipTarget) c += 100 * Math.max(0, m.tip.distanceTo(tipTarget) - (mode === "old" ? 0 : 0.015)) ** 2;
        if (seatHeld) c += 100 * centroid(pos(big.groups.seat)).distanceToSquared(oldSeat);
        for (const k of Object.keys(supported)) {
          const s = supported[k];
          const now = m.lows[k];
          if (!s || !now) continue;
          c += 100 * (now.y - s.y) ** 2 + (now.y < s.y - 0.01 ? 300 * (now.y - s.y) ** 2 : 0);
          c += 5 * ((now.x - s.x) ** 2 + (now.z - s.z) ** 2);
        }
        // Nothing of him through the floor.
        if (m.lows.all && m.lows.all.y < Math.min(old.lows.all!.y, 0) - 0.005) c += 300 * (m.lows.all.y - Math.min(old.lows.all!.y, 0)) ** 2;
        if (herOnHim.L < 0.06 || herOnHim.R < 0.06) {
          const skin = pos(big.groups.skin);
          if (herOnHim.L < 0.06) c += 50 * (near(herHL, skin) - herOnHim.L) ** 2;
          if (herOnHim.R < 0.06) c += 50 * (near(herHR, skin) - herOnHim.R) ** 2;
        }
        for (let i = 0; i < x.length; i++) c += (i < 3 ? 0.5 : 0.08) * (x[i] - x0[i]) ** 2;
        // Knees don't bend backwards.
        for (const i of [5, 7]) if (x[i] < 0) c += 50 * x[i] ** 2;
        return c;
      };
      // Also started from squats, as a straight-legged man has to bend his knees together with his hips to come down.
      const seeds = lying ? [x0] : [0, 1, 2].map((k) => x0.map((v, i) => v + k * ([0, 0, 0, 0.06, 0.3, 0.6, 0.3, 0.6, 0, 0, 0][i] ?? 0)));
      const x1 =
        mode !== "herUp" && (tipTarget || seatHeld || herOnHim.L < 0.06 || herOnHim.R < 0.06)
          ? seeds.map((seed) => solve(cost1, seed, steps)).reduce((a, b) => (cost1(a) <= cost1(b) ? a : b))
          : x0;
      // Stage 2: the arms of the hands that held something, back on it.
      const a0 = [bd.armL.x, bd.armL.out, bd.armL.elbow, bd.armL.y, bd.armR.x, bd.armR.out, bd.armR.elbow, bd.armR.y];
      const aSteps = [holds.L ? 0.08 : 0, holds.L ? 0.06 : 0, holds.L ? 0.08 : 0, holds.L ? 0.06 : 0, holds.R ? 0.08 : 0, holds.R ? 0.06 : 0, holds.R ? 0.08 : 0, holds.R ? 0.06 : 0];
      const cost2 = (a: number[]) => {
        const { body, place } = make(x1, a);
        placeBody(big, body, place);
        big.model.updateMatrixWorld(true);
        let c = 0;
        if (holds.L) c += 100 * big.groups.handL.getWorldPosition(new Vector3()).distanceToSquared(old.handL);
        if (holds.R) c += 100 * big.groups.handR.getWorldPosition(new Vector3()).distanceToSquared(old.handR);
        for (let i = 0; i < a.length; i++) c += 0.03 * (a[i] - a0[i]) ** 2;
        return c;
      };
      const a1 = holds.L || holds.R ? solve(cost2, a0, aSteps) : a0;
      // Rounded, as written into sexpose.ts, and measured again.
      const xr = x1.map((v) => r(v, 3));
      const ar = a1.map((v) => r(v, 2));
      const fin = make(xr, ar);
      placeBody(big, fin.body, fin.place);
      const now = measure(big);
      const bigSkin = pos(big.groups.skin);
      const seatNow = centroid(pos(big.groups.seat));
      // She comes up to him instead (kneeling up taller to his bigger body): her own legs and back, her knees kept down.
      let herUp: { body: Body; place: Place; gap: number } | null = null;
      if (mode === "herUp") {
        placeBody(big, man.body, man.place);
        const rawTip = measure(big).tip;
        const holeName = (["mouth", "vulva", "anus"] as const).reduce((a, b) => ((holes[a]?.distanceTo(old.tip) ?? 9) <= (holes[b]?.distanceTo(old.tip) ?? 9) ? a : b));
        const hole = holes[holeName]!;
        const want = hole.clone().add(rawTip.clone().sub(old.tip));
        const hb = herBody;
        const hp = scene.her.place;
        placeBody(her, hb, hp);
        her.model.updateMatrixWorld(true);
        const herLows = { legL: minY(pos(her.groups.legL)), legR: minY(pos(her.groups.legR)) };
        const h0 = [hb.drop, hb.legL.x, hb.legL.knee, hb.legR.x, hb.legR.knee, hb.torso[0], hb.head[0]];
        const makeHer = (h: number[]): Body => ({ ...hb, drop: h[0], legL: { ...hb.legL, x: h[1], knee: h[2] }, legR: { ...hb.legR, x: h[3], knee: h[4] }, torso: [h[5], hb.torso[1], hb.torso[2]], head: [h[6], hb.head[1], hb.head[2]] });
        const holeRe = holeName === "mouth" ? /^T_lip$/ : holeName === "vulva" ? /^T_vulva$/ : /^T_anus$/;
        const cost4 = (h: number[]) => {
          placeBody(her, makeHer(h), hp);
          her.model.updateMatrixWorld(true);
          let c = 100 * herVerts(holeRe)!.distanceToSquared(want);
          for (const k of ["legL", "legR"] as const) {
            const was = herLows[k];
            const now = minY(pos(her.groups[k]));
            if (was && now) c += 100 * (now.y - was.y) ** 2 + 5 * ((now.x - was.x) ** 2 + (now.z - was.z) ** 2);
          }
          for (let i = 0; i < h.length; i++) c += 0.08 * (h[i] - h0[i]) ** 2;
          for (const i of [2, 4]) if (h[i] < 0) c += 50 * h[i] ** 2;
          return c;
        };
        const h1 = solve(cost4, h0, [0.03, 0.08, 0.08, 0.08, 0.08, 0.06, 0.06]).map((v, i) => r(v, i === 0 ? 3 : 2));
        const body = makeHer(h1);
        placeBody(her, body, hp);
        her.model.updateMatrixWorld(true);
        herUp = { body, place: hp, gap: r(herVerts(holeRe)!.distanceTo(rawTip)) };
        placeBody(her, herBody, scene.her.place);
        her.model.updateMatrixWorld(true);
      }
      // Her hand moved to his tip instead (she reaches for him): the spot's reach arm.
      let reach: { key: "armL" | "armR"; arm: Body["armL"]; gap: number } | null = null;
      if (mode === "reach" && man.label !== "lead") {
        const spot = joins[mi - (scene.them ? 1 : 0)];
        const key = spot.slot === "left" ? "armL" : "armR";
        const herHand = key === "armL" ? herHL : herHR;
        const want = herHand.clone().add(now.tip.clone().sub(old.tip));
        const base = herBody[key];
        const h0 = [base.x, base.out, base.elbow, base.y];
        const handOf = () => (key === "armL" ? her.groups.handL : her.groups.handR).getWorldPosition(new Vector3());
        const cost3 = (h: number[]) => {
          const arm = { ...base, x: h[0], out: h[1], elbow: h[2], y: h[3] };
          placeBody(her, { ...herBody, [key]: arm }, scene.her.place);
          her.model.updateMatrixWorld(true);
          let c = 100 * handOf().distanceToSquared(want);
          for (let i = 0; i < 4; i++) c += 0.03 * (h[i] - h0[i]) ** 2;
          return c;
        };
        const h1 = solve(cost3, h0, [0.08, 0.06, 0.08, 0.06]).map((v) => r(v, 2));
        const arm = { ...base, x: h1[0], out: h1[1], elbow: h1[2], y: h1[3] };
        placeBody(her, { ...herBody, [key]: arm }, scene.her.place);
        her.model.updateMatrixWorld(true);
        reach = { key, arm, gap: r(handOf().distanceTo(now.tip)) };
        placeBody(her, herBody, scene.her.place);
        her.model.updateMatrixWorld(true);
      }
      // As it was untouched at the new size, for the report.
      placeBody(big, man.body, man.place);
      const raw = measure(big);
      raw.tip.add(dy);
      const gapTo = (t: Vector3) =>
        Object.fromEntries(Object.entries({ ...holes, handL: herHL, handR: herHR }).map(([k, v]) => [k, v ? r(v.distanceTo(t)) : null]));
      result[name].push({
        man: man.label,
        mode,
        lying,
        tipAt: !!tipTarget,
        full: { place: fin.place, body: fin.body },
        orig: { place: man.place, body: man.body },
        reach,
        herUp,
        herOrig: herBody,
        holds,
        supported: Object.fromEntries(Object.entries(supported).map(([k, v]) => [k, v ? r(v.y) : null])),
        gapOld: gapTo(old.tip),
        gapNow: gapTo(now.tip),
        tipMoved: { raw: r(raw.tip.distanceTo(old.tip)), solved: r(now.tip.distanceTo(old.tip)) },
        handMoved: {
          L: holds.L ? { raw: r(raw.handL.distanceTo(old.handL)), solved: r(now.handL.distanceTo(old.handL)) } : null,
          R: holds.R ? { raw: r(raw.handR.distanceTo(old.handR)), solved: r(now.handR.distanceTo(old.handR)) } : null,
        },
        herHandsOnHim: { oldL: r(herOnHim.L), oldR: r(herOnHim.R), L: r(near(herHL, bigSkin)), R: r(near(herHR, bigSkin)) },
        seat: seatHeld ? r(seatNow.distanceTo(oldSeat)) : null,
        lows: Object.fromEntries(Object.entries(now.lows).map(([k, v]) => [k, v ? r(v.y) : null])),
        oldLows: Object.fromEntries(Object.entries(old.lows).map(([k, v]) => [k, v ? r(v.y) : null])),
        headUp: { old: r(old.head.y), now: r(now.head.y) },
      });
    }
  }
  writeFileSync(join(out, "tallsolve.json"), JSON.stringify(result, null, 1));
});
