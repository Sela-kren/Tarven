import { Object3D, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { Jiggle, type SpringSettings } from "../src/game/jiggle";

const SETTINGS: SpringSettings = { frequency: 2, damping: 0.3, gain: 0.003, axes: [1, 1, 1], limit: 0.02 };

function rig() {
  const parent = new Object3D();
  const bone = new Object3D();
  bone.position.set(0, 1, 0);
  parent.add(bone);
  return { parent, bone, jiggle: new Jiggle(bone, SETTINGS) };
}

describe("Jiggle", () => {
  it("lags behind when its parent speeds up, within its limit", () => {
    const { parent, bone, jiggle } = rig();
    const dt = 1 / 60;
    let lowest = 1;
    for (let frame = 0, v = 0; frame < 30; frame++) {
      v += 8 * dt; // accelerating upwards
      parent.position.y += v * dt;
      jiggle.update(dt);
      lowest = Math.min(lowest, bone.position.y);
    }
    expect(lowest).toBeLessThan(1);
    expect(lowest).toBeGreaterThanOrEqual(1 - SETTINGS.limit - 1e-9);
  });

  it("settles back to rest once the parent holds still", () => {
    const { parent, bone, jiggle } = rig();
    const dt = 1 / 60;
    for (let frame = 0; frame < 20; frame++) {
      parent.position.x += 0.05 * frame * dt;
      jiggle.update(dt);
    }
    for (let frame = 0; frame < 600; frame++) jiggle.update(dt);
    expect(bone.position.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-4);
  });

  it("does not move at strength 0", () => {
    const { parent, bone, jiggle } = rig();
    jiggle.strength = 0;
    for (let frame = 0; frame < 30; frame++) {
      parent.position.y += frame * 0.01;
      jiggle.update(1 / 60);
    }
    expect(bone.position.y).toBe(1);
  });

  it("swings away from the body but never into it, within its range", () => {
    const parent = new Object3D();
    const bone = new Object3D();
    bone.position.set(0, 1, 0);
    parent.add(bone);
    // Like her long hair on her back: free to swing back (+z), not forwards into her (-z).
    const jiggle = new Jiggle(bone, { ...SETTINGS, range: [[-0.01, 0.01], [-0.02, 0.02], [0, 0.02]] });
    const dt = 1 / 60;
    let most = 0, least = 0;
    // Back and forth, hard, so it would swing both ways if it could.
    for (let frame = 0; frame < 240; frame++) {
      parent.position.z = 0.15 * Math.sin(frame * dt * 2 * Math.PI * 2);
      jiggle.update(dt);
      most = Math.max(most, bone.position.z);
      least = Math.min(least, bone.position.z);
    }
    expect(least).toBe(0);
    expect(most).toBeGreaterThan(0.005);
    expect(most).toBeLessThanOrEqual(0.02);
  });
});
