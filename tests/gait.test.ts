import { describe, expect, it } from "vitest";
import { Object3D, Vector3 } from "three";
import type { Input } from "../src/game/input";
import { Body, FEMALE_WALK_STYLE, Sibling, styledStance, styledStrides } from "../src/game/player";

describe("female walk style scale", () => {
  it("has no sway at level 1", () => {
    const { walk } = styledStrides(1);
    expect(walk.hipRoll).toBe(0);
    expect(walk.crossover).toBe(0);
  });

  it("sways more at every level up to 5", () => {
    const rolls = [1, 2, 3, 4, 5].map((level) => styledStrides(level).walk.hipRoll);
    for (let i = 1; i < rolls.length; i++) expect(rolls[i]).toBeGreaterThan(rolls[i - 1]);
  });

  it("holds levels outside 1 to 5 at the ends", () => {
    expect(styledStrides(9)).toEqual(styledStrides(5));
    expect(styledStrides(-2)).toEqual(styledStrides(1));
  });
});

function skeleton(name: string): Object3D {
  const root = new Object3D();
  root.name = name;
  const add = (parent: Object3D, label: string, x = 0, y = 0) => {
    const bone = new Object3D();
    bone.name = `${name}_${label}`;
    bone.position.set(x, y, 0);
    parent.add(bone);
    return bone;
  };
  const hips = add(root, "Hips", 0, 0.86);
  const torso = add(hips, "Torso", 0, 0.12);
  add(torso, "Head", 0, 0.39);
  for (const [side, sx] of [["L", -1], ["R", 1]] as const) {
    add(add(torso, `UpperArm_${side}`, sx * 0.1, 0.32), `ForeArm_${side}`, 0, -0.25);
    add(add(hips, `Thigh_${side}`, sx * 0.098, -0.06), `Shin_${side}`, 0, -0.33);
  }
  return root;
}

describe("walk style key", () => {
  it("cycles the sister through 1 to 5 and back to 1", () => {
    const sister = new Sibling(skeleton("Female"), "Female", new Vector3());
    const seen = [sister.walkStyle];
    for (let i = 0; i < 5; i++) seen.push(sister.cycleWalkStyle());
    expect(seen).toEqual([FEMALE_WALK_STYLE, ...[1, 2, 3, 4, 5].map((n) => ((FEMALE_WALK_STYLE + n - 1) % 5) + 1)]);
  });

  it("leaves the brother's plain walk alone", () => {
    const brother = new Sibling(skeleton("Male"), "Male", new Vector3());
    expect(brother.walkStyle).toBeNull();
    expect(brother.cycleWalkStyle()).toBeNull();
  });
});

describe("standing pose scale", () => {
  it("pops the hip further at every level", () => {
    const pops = [1, 2, 3, 4, 5].map((level) => styledStance(level).hipShift);
    for (let i = 1; i < pops.length; i++) expect(pops[i]).toBeGreaterThan(pops[i - 1]);
  });

  it("only puts the hand on the hip at level 5", () => {
    expect(styledStance(4).handOnHip).toBe(0);
    expect(styledStance(5).handOnHip).toBe(1);
  });
});

describe("walking drunk", () => {
  /** Holds S (walk towards +Z) for `seconds` at 60 frames a second. */
  function walkDown(drunk: number, seconds: number): Sibling {
    const brother = new Sibling(skeleton("Male"), "Male", new Vector3());
    const input = { left: false, right: false, up: false, down: true, run: false } as Input;
    for (let i = 0; i < seconds * 60; i++) brother.move(1 / 60, input, [], drunk);
    return brother;
  }

  it("walks dead straight when sober", () => {
    const sober = walkDown(0, 2);
    expect(sober.position.x).toBe(0);
    expect(sober.position.z).toBeCloseTo(6.4, 5);
    expect(sober.root.rotation.z).toBe(0);
  });

  it("veers off the line, goes slower, and sways when drunk", () => {
    const random = Math.random;
    Math.random = () => 0.99; // No stumbles, so the test is repeatable.
    try {
      const drunk = walkDown(0.9, 2);
      expect(Math.abs(drunk.position.x)).toBeGreaterThan(0.1);
      expect(drunk.position.z).toBeLessThan(6.4 * 0.85);
      expect(drunk.root.rotation.z).not.toBe(0);
    } finally {
      Math.random = random;
    }
  });

  it("stumbles now and then once properly drunk, but never while sober or tipsy", () => {
    const random = Math.random;
    Math.random = () => 0;
    try {
      const input = { left: false, right: false, up: false, down: true, run: false } as Input;
      const brother = new Sibling(skeleton("Male"), "Male", new Vector3());
      expect(brother.move(1 / 60, input, [], 0.4)).toBe(false);
      expect(brother.move(1 / 60, input, [], 1)).toBe(true);
      // Still mid-stumble: no second one starts.
      expect(brother.move(1 / 60, input, [], 1)).toBe(false);
    } finally {
      Math.random = random;
    }
  });
});

describe("reshaping a body", () => {
  it("keeps its skirt after the body has moved out of the loaded model", () => {
    const loaded = new Object3D();
    const root = skeleton("Female");
    const hips = root.getObjectByName("Female_Hips")!;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const panel = new Object3D();
      panel.name = `Female_Skirt${i}`;
      panel.position.set(Math.cos(angle) * 0.18, -0.02, Math.sin(angle) * 0.12);
      const hem = new Object3D();
      hem.name = `Female_SkirtHem${i}`;
      hem.position.set(Math.cos(angle) * 0.05, -0.36, Math.sin(angle) * 0.05);
      panel.add(hem);
      hips.add(panel);
    }
    loaded.add(root);
    const body = new Body(loaded, "Female");
    expect(body.hasSkirt).toBe(true);
    // A sibling takes the body out of the loaded model; a new look then rebuilds the skirt.
    new Object3D().add(body.root);
    body.refreshRest();
    expect(body.hasSkirt).toBe(true);
  });
});
