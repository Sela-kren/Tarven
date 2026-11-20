import { describe, expect, it } from "vitest";
import { Object3D, Vector3 } from "three";
import { applyPose, BATTLE_POSES, blendPose, FIST, poseBones, poseForEvent, restingPose, turnBeats, WINDED_BELOW } from "../src/game/battlepose";
import { activeTerms } from "../src/game/appearance";
import { cardFraming, facingTurn, FRAME_KEEP } from "../src/game/battleframe";

/** A bare skeleton with the bones a pose moves, named as on the real bodies. */
function skeleton(): Object3D {
  const root = new Object3D();
  root.name = "Female";
  const bone = (name: string, parent: Object3D, y = 0) => {
    const b = new Object3D();
    b.name = `Female_${name}`;
    b.position.y = y;
    parent.add(b);
    return b;
  };
  const hips = bone("Hips", root, 0.9);
  const torso = bone("Torso", hips, 0.2);
  bone("Head", torso, 0.4);
  for (const side of ["L", "R"]) {
    const upper = bone(`UpperArm_${side}`, torso, 0.3);
    bone(`ForeArm_${side}`, upper, -0.27);
    const thigh = bone(`Thigh_${side}`, hips, -0.05);
    bone(`Shin_${side}`, thigh, -0.42);
    const fore = root.getObjectByName(`Female_ForeArm_${side}`)!;
    const fingers = bone(`HandFingers_${side}`, fore, -0.3);
    bone(`HandTips_${side}`, fingers, -0.04);
    bone(`HandThumb_${side}`, fore, -0.21);
  }
  return root;
}

const SHOTS = new Set(["strike:hit", "their:hit", "their:dodged", "dodge", "lost", "their:grab", "stare:ok"]);
const hasShot = (e: string) => SHOTS.has(e);

describe("which pose each brawl event strikes", () => {
  it("her own moves", () => {
    expect(poseForEvent("strike:hit")).toBe("strike");
    expect(poseForEvent("strike:miss")).toBe("strike");
    expect(poseForEvent("shove:hit")).toBe("shove");
    expect(poseForEvent("throw")).toBe("shove");
    expect(poseForEvent("headlock:hit")).toBe("grapple");
    expect(poseForEvent("dodge")).toBe("dodge");
    expect(poseForEvent("talk:ok")).toBe("stare");
    expect(poseForEvent("stare:win")).toBe("stare");
    expect(poseForEvent("steel")).toBe("stare");
    expect(poseForEvent("reach:slap")).toBe("strike");
    expect(poseForEvent("reach:pull")).toBe("dodge");
  });

  it("theirs: a blow lands, she ducks it, or they get hold of her", () => {
    expect(poseForEvent("their:hit")).toBe("guard");
    expect(poseForEvent("their:tackle")).toBe("guard");
    expect(poseForEvent("their:dodged")).toBe("dodge");
    for (const grapple of ["their:grab", "their:headlock", "their:hairpull", "their:bearhug", "their:armtwist", "their:pin", "their:collar"]) {
      expect(poseForEvent(grapple)).toBe("held");
    }
    expect(poseForEvent("their:sweep")).toBe("down");
    expect(poseForEvent("lost")).toBe("down");
  });

  it("leaves her be for what isn't a blow or a move", () => {
    for (const event of ["start", "their:miss", "their:reach", "their:wander", "staggered", "suppress", "spent", "knockout"]) {
      expect(poseForEvent(event)).toBeNull();
    }
  });
});

describe("how she's left after a turn", () => {
  it("on her feet, winded when she's nearly spent, down when she's lost", () => {
    expect(restingPose({ stamina: 20, maxStamina: 20, lost: false })).toBe("ready");
    expect(restingPose({ stamina: 20 * WINDED_BELOW - 1, maxStamina: 20, lost: false })).toBe("winded");
    expect(restingPose({ stamina: 20 * WINDED_BELOW, maxStamina: 20, lost: false })).toBe("ready");
    expect(restingPose({ stamina: 0, maxStamina: 20, lost: true })).toBe("down");
  });
});

describe("a turn's poses, timed to its comic moments", () => {
  it("strikes each pose as its moment comes up, then settles a moment after the last", () => {
    const beats = turnBeats(["strike:hit", "staggered", "their:hit"], hasShot, 1.8, "ready");
    expect(beats).toEqual([
      { pose: "strike", at: 0, hurt: false },
      { pose: "guard", at: 1.8, hurt: true },
      { pose: "ready", at: 3.6, hurt: false },
    ]);
  });

  it("counts moments without a pose, so later poses still line up", () => {
    const beats = turnBeats(["stare:ok", "their:dodged"], (e) => e === "stare:ok" || e === "their:dodged", 2, "ready");
    expect(beats.map((b) => [b.pose, b.at])).toEqual([["stare", 0], ["dodge", 2], ["ready", 4]]);
  });

  it("flashes for a blow that lands or a hold, but not for settling down after losing", () => {
    const beats = turnBeats(["their:grab", "lost"], hasShot, 1, "down");
    expect(beats.map((b) => b.hurt)).toEqual([true, true, false]);
  });

  it("still settles with no moments at all", () => {
    expect(turnBeats([], hasShot, 1.8, "winded")).toEqual([{ pose: "winded", at: 1.8, hurt: false }]);
  });
});

describe("striking a pose on the bones", () => {
  const options = { female: true, legLength: 0.85, hipsBaseY: 0.9 };

  it("mirrors for a fight on her other side: her limbs trade places, turns and tilts flip", () => {
    for (const name of Object.keys(BATTLE_POSES) as (keyof typeof BATTLE_POSES)[]) {
      const a = poseBones(skeleton(), "Female");
      const b = poseBones(skeleton(), "Female");
      const turnA = applyPose(a, BATTLE_POSES[name], { ...options, mirror: false });
      const turnB = applyPose(b, BATTLE_POSES[name], { ...options, mirror: true });
      expect(turnB).toBeCloseTo(-turnA);
      expect(b.upperL!.rotation.x).toBeCloseTo(a.upperR!.rotation.x);
      expect(b.upperL!.rotation.y).toBeCloseTo(-a.upperR!.rotation.y);
      expect(b.upperL!.rotation.z).toBeCloseTo(-a.upperR!.rotation.z);
      expect(b.thighR!.rotation.x).toBeCloseTo(a.thighL!.rotation.x);
      expect(b.shinR!.rotation.x).toBeCloseTo(a.shinL!.rotation.x);
      expect(b.torso!.rotation.y).toBeCloseTo(-a.torso!.rotation.y);
      expect(b.head!.rotation.y).toBeCloseTo(-a.head!.rotation.y);
    }
  });

  it("swings her arms from straight down, however far she leans", () => {
    const bones = poseBones(skeleton(), "Female");
    applyPose(bones, BATTLE_POSES.shove, { ...options, mirror: false });
    const lean = bones.hips!.rotation.x + bones.torso!.rotation.x;
    expect(lean).toBeLessThan(0);
    expect(bones.upperR!.rotation.x + lean).toBeCloseTo(BATTLE_POSES.shove.armNear.x);
  });

  it("lowers her hips for a pose on her knees, from their rest", () => {
    const bones = poseBones(skeleton(), "Female");
    bones.hips!.position.set(0, 0.5, 0.2);
    applyPose(bones, BATTLE_POSES.down, { ...options, mirror: false, hipsBaseZ: 0 });
    expect(bones.hips!.position.y).toBeCloseTo(0.9 - 0.85 * BATTLE_POSES.down.drop);
    expect(bones.hips!.position.z).toBe(0);
  });

  it("gives a man's pelvis only a little of her tilt", () => {
    const bones = poseBones(skeleton(), "Female");
    applyPose(bones, BATTLE_POSES.dodge, { ...options, female: false, mirror: false });
    expect(bones.hips!.rotation.x).toBeCloseTo(-BATTLE_POSES.dodge.arch * 0.2);
  });

  it("closes her fists to swing and to guard, and opens her hands to shove", () => {
    const bones = poseBones(skeleton(), "Female");
    applyPose(bones, BATTLE_POSES.strike, { ...options, mirror: false });
    // Curling in is negative Z on her right hand, positive on her left.
    expect(bones.fingersR!.rotation.z).toBeCloseTo(-FIST.fingers);
    expect(bones.tipsR!.rotation.z).toBeCloseTo(-FIST.tips);
    expect(bones.fingersL!.rotation.z).toBeCloseTo(FIST.fingers);
    expect(bones.thumbL!.rotation.y).toBeCloseTo(-FIST.thumb[1]);
    applyPose(bones, BATTLE_POSES.shove, { ...options, mirror: false });
    expect(bones.fingersR!.rotation.z).toBeCloseTo(0);
    expect(bones.thumbR!.rotation.y).toBeCloseTo(0);
  });

  it("leaves a body without finger bones be", () => {
    const root = skeleton();
    for (const side of "LR") root.getObjectByName(`Female_HandFingers_${side}`)!.name = "gone";
    const bones = poseBones(root, "Female");
    expect(bones.fingersR).toBeNull();
    expect(() => applyPose(bones, BATTLE_POSES.strike, { ...options, mirror: false })).not.toThrow();
  });

  it("blends from one pose to the next", () => {
    const half = blendPose(BATTLE_POSES.ready, BATTLE_POSES.strike, 0.5);
    expect(half.turn).toBeCloseTo((BATTLE_POSES.ready.turn + BATTLE_POSES.strike.turn) / 2);
    expect(blendPose(BATTLE_POSES.ready, BATTLE_POSES.strike, 1)).toEqual(BATTLE_POSES.strike);
  });
});

describe("the fingers' own bones in her look", () => {
  it("grow with her hands, and thicken with her arms, like the forearm they used to be part of", () => {
    for (const slider of ["hands", "arms", "build"]) {
      const active = activeTerms("Female", { [slider]: 1 });
      for (const bone of ["HandFingers_L", "HandTips_R", "HandThumb_L"]) expect(active.get(bone)?.length, `${slider} ${bone}`).toBeGreaterThan(0);
    }
    // His arms and build are physique morphs now (MPFB shape keys, appearance.ts MALE_SLIDERS): no bones.
    expect(activeTerms("Male", { muscle: 1, fat: 1 }).size).toBe(0);
  });
});

describe("framing the picture", () => {
  it("turns her a little towards the fight, whichever side it's on", () => {
    expect(facingTurn(1)).toBeGreaterThan(Math.PI);
    expect(facingTurn(-1)).toBeLessThan(Math.PI);
  });

  it("follows her down without zooming out: the same span, the camera lower", () => {
    const standing = cardFraming({ crown: new Vector3(0, 1.7, 0), height: 1.7, side: -1, fov: 28 });
    const kneeling = cardFraming({ crown: new Vector3(0, 1.2, 0), height: 1.7, side: -1, fov: 28 });
    expect(kneeling.position.z).toBeCloseTo(standing.position.z);
    expect(standing.target.y - kneeling.target.y).toBeCloseTo(0.5);
    // Head to mid-thigh: the middle of the picture is half the kept span under the top of her hair.
    expect(standing.target.y).toBeLessThan(1.7 - (FRAME_KEEP * 1.7) / 2 + 0.1);
  });
});
