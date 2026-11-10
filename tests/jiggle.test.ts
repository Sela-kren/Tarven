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
});
