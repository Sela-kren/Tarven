import { describe, expect, it } from "vitest";
import { Object3D, Quaternion } from "three";
import { Skirt } from "../src/game/skirt";

/** Hips with two legs and eight skirt panels, shaped like the female model. */
function rig() {
  const root = new Object3D();
  root.name = "Test";
  const add = (parent: Object3D, label: string, x: number, y: number, z: number) => {
    const bone = new Object3D();
    bone.name = `Test_${label}`;
    bone.position.set(x, y, z);
    parent.add(bone);
    return bone;
  };
  const hips = add(root, "Hips", 0, 0.86, 0);
  const legs: [Object3D, Object3D][] = (["L", "R"] as const).map((side, i) => {
    const thigh = add(hips, `Thigh_${side}`, (i ? 1 : -1) * 0.098, -0.06, 0);
    return [thigh, add(thigh, `Shin_${side}`, (i ? 1 : -1) * 0.0165, -0.33, 0)];
  });
  // The model's panels, round the body from the right side through the front (-z): head, then knee joint.
  const panels = [
    [0.1862, 0, 0.0562, 0], [0.1316, -0.0659, 0.0397, -0.0556], [0, -0.0932, 0, -0.0786], [-0.1316, -0.0659, -0.0397, -0.0556],
    [-0.1862, 0, -0.0562, 0], [-0.1316, 0.1005, -0.0397, 0.0397], [0, 0.1422, 0, 0.0562], [0.1316, 0.1005, 0.0397, 0.0397],
  ];
  panels.forEach(([x, z, kx, kz], i) => add(add(hips, `Skirt${i}`, x, -0.02, z), `SkirtHem${i}`, kx, -0.36, kz));
  const skirt = Skirt.find(root, "Test", hips, legs);
  if (!skirt) throw new Error("no skirt");
  const angle = (label: string) => 2 * Math.acos(Math.min(1, Math.abs(root.getObjectByName(`Test_${label}`)!.quaternion.w)));
  return { skirt, hips, legs, angle };
}

const FRONT = 2;
const BACK = 6;

describe("skirt panels", () => {
  it("hang at rest while she stands straight", () => {
    const { skirt, angle } = rig();
    skirt.solve(1 / 60);
    // At most a degree or so, where the thighs just touch the cloth.
    for (let i = 0; i < 8; i++) {
      expect(angle(`Skirt${i}`)).toBeLessThan(0.03);
      expect(angle(`SkirtHem${i}`)).toBeLessThan(0.03);
    }
  });

  it("swing out at the back over a heel kicked up behind, and leave the front alone", () => {
    const { skirt, legs, angle } = rig();
    legs[0][0].rotation.x = -0.6;
    legs[0][1].rotation.x = -1.2;
    skirt.solve(1 / 60);
    expect(angle(`Skirt${BACK}`) + angle(`SkirtHem${BACK}`)).toBeGreaterThan(0.5);
    expect(angle(`Skirt${FRONT}`) + angle(`SkirtHem${FRONT}`)).toBeLessThan(0.01);
  });

  it("swing out at the front over a knee lifted forwards", () => {
    const { skirt, legs, angle } = rig();
    legs[1][0].rotation.x = 0.9;
    legs[1][1].rotation.x = -0.9;
    skirt.solve(1 / 60);
    expect(angle(`Skirt${FRONT}`)).toBeGreaterThan(0.4);
    expect(angle(`Skirt${BACK}`)).toBeLessThan(0.01);
  });

  it("fall back slowly once the leg has passed, or at once with no time passing", () => {
    const { skirt, legs, angle } = rig();
    legs[0][0].rotation.x = -0.6;
    legs[0][1].rotation.x = -1.2;
    skirt.solve(1 / 60);
    const lifted = angle(`SkirtHem${BACK}`) + angle(`Skirt${BACK}`);
    legs[0][0].rotation.x = 0;
    legs[0][1].rotation.x = 0;
    skirt.solve(1 / 60);
    const next = angle(`SkirtHem${BACK}`) + angle(`Skirt${BACK}`);
    expect(next).toBeLessThan(lifted);
    expect(next).toBeGreaterThan(lifted * 0.5);
    skirt.solve(0);
    expect(angle(`SkirtHem${BACK}`) + angle(`Skirt${BACK}`)).toBeLessThan(0.01);
  });

  it("hangs straight down when the hips tilt", () => {
    const { skirt, hips, legs } = rig();
    hips.rotation.z = 0.15;
    for (const [thigh] of legs) thigh.rotation.z = -0.15; // the legs stay upright
    skirt.solve(1 / 60);
    // The side panels turn back against the tilt: the high side hangs straight, and the low side as far
    // as the leg under it allows.
    const world = new Quaternion();
    const tilted = [0, 4].map((i) => {
      hips.getObjectByName(`Test_Skirt${i}`)!.getWorldQuaternion(world);
      return 2 * Math.acos(Math.min(1, Math.abs(world.w)));
    });
    expect(Math.min(...tilted)).toBeLessThan(0.01);
    expect(Math.max(...tilted)).toBeLessThan(0.075);
  });
});
