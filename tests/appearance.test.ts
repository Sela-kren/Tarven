import { describe, expect, it } from "vitest";
import {
  Bone,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  MeshLambertMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import {
  activeTerms,
  armSpreadFor,
  bandWeight,
  copyLook,
  CUPS,
  dressColors,
  Dresser,
  dyeColor,
  hairMeshFor,
  legwearOf,
  LOOK_OPTIONS,
  nearestStop,
  newLook,
  outfitOf,
  PIRATE_LOOKS,
  pirateGuestColors,
  playerOutfits,
  randomLook,
  readLook,
  readLooks,
  reshape,
  shapeAmount,
  stopValue,
  toneColor,
  wearOutfit,
  type Look,
} from "../src/game/appearance";

/**
 * A tiny female-named rig: hips, one leg (thigh and shin) and a torso, with a body mesh of four points:
 * a sole on the floor under the shin, a knee, a hip and a chest, each skinned to one bone.
 */
function rig() {
  const model = new Group();
  const root = new Group();
  root.name = "Female";
  model.add(root);
  const bone = (name: string, x: number, y: number, z: number) => {
    const b = new Bone();
    b.name = `Female_${name}`;
    b.position.set(x, y, z);
    return b;
  };
  const hips = bone("Hips", 0, 0.86, 0);
  const thigh = bone("Thigh_L", -0.1, -0.06, 0);
  const shin = bone("Shin_L", 0, -0.33, 0);
  const torso = bone("Torso", 0, 0.12, 0);
  hips.add(thigh, torso);
  thigh.add(shin);
  root.add(hips);
  root.updateMatrixWorld(true);

  const geometry = new BufferGeometry();
  // sole (shin), knee (thigh), hip (hips), chest (torso)
  geometry.setAttribute("position", new Float32BufferAttribute([-0.1, 0, 0, -0.1, 0.5, 0, 0.1, 0.86, 0, 0.15, 1.2, 0.05], 3));
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute([2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0], 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  const material = new MeshLambertMaterial({ name: "T_skirt", color: 0x2b3d23 });
  const mesh = new SkinnedMesh(geometry, material);
  // Named as the cloth layer, since the skirt's material belongs to it.
  mesh.name = "Female_Cloth";
  root.add(mesh);
  mesh.bind(new Skeleton([hips, thigh, shin, torso]));
  return { model, root, mesh, hips, thigh, shin, torso };
}

/** Where each of the mesh's points sits with the bones at rest, skinned. */
function skinned(mesh: SkinnedMesh): Vector3[] {
  mesh.parent!.updateMatrixWorld(true);
  mesh.skeleton.update();
  const points: Vector3[] = [];
  for (let i = 0; i < mesh.geometry.getAttribute("position").count; i++) {
    points.push(mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  return points;
}

const look = (sliders: Record<string, number> = {}, colors: Record<string, string> = {}): Look => ({
  ...newLook(),
  sliders,
  colors,
});

describe("reshaping", () => {
  it("grows across, fades along the height, and only stretches inside its span", () => {
    const out = new Vector3();
    expect(reshape([{ grow: [0.5, 0, 0] }], new Vector3(0.2, 0, 0), out).x).toBeCloseTo(0.3);
    // Full at y = 0.3, nothing by y = 0.1: halfway up, half the growth.
    expect(reshape([{ grow: [0.5, 0, 0], fade: [0.3, 0.1] }], new Vector3(0.2, 0.2, 0), out).x).toBeCloseTo(0.25);
    expect(reshape([{ grow: [0.5, 0, 0], fade: [0.3, 0.1] }], new Vector3(0.2, 0.05, 0), out).x).toBeCloseTo(0.2);
    // A shin that grows 10% stretches down to the ankle; the foot below just moves down with it.
    expect(reshape([{ grow: [0, 0.1, 0], span: [-0.35, 0] }], new Vector3(0, -0.2, 0), out).y).toBeCloseTo(-0.22);
    expect(reshape([{ grow: [0, 0.1, 0], span: [-0.35, 0] }], new Vector3(0, -0.45, 0), out).y).toBeCloseTo(-0.485);
  });

  it("lengthens hair below its pivot only", () => {
    const out = new Vector3();
    const longer = [{ grow: [0, 0.9, 0] as [number, number, number], pivot: 0.12, span: [-1, 0] as const }];
    // Above the pivot (the top of the head) nothing moves; the ends 0.1 below it drop by 0.09.
    expect(reshape(longer, new Vector3(0, 0.2, 0), out).y).toBeCloseTo(0.2);
    expect(reshape(longer, new Vector3(0, 0.02, 0), out).y).toBeCloseTo(-0.07);
  });

  it("only gives bones terms for sliders that are set", () => {
    expect(activeTerms("Female", {}).size).toBe(0);
    const terms = activeTerms("Female", { bust: 1, nonsense: 1 });
    expect([...terms.keys()]).toEqual(["Bust"]);
    expect(terms.get("Bust")![0].grow).toEqual([2.52, 2.07, 3.55]);
    // Shrinking has its own, smaller amounts.
    expect(activeTerms("Female", { bust: -1 }).get("Bust")![0].grow).toEqual([-0.2, -0.25, -0.7]);
  });
});

describe("dressing a character", () => {
  it("leaves the model exactly as built for the default look", () => {
    const { model, mesh } = rig();
    const before = skinned(mesh);
    new Dresser(model, "Female").apply(newLook());
    skinned(mesh).forEach((point, i) => expect(point.distanceTo(before[i])).toBeLessThan(1e-6));
    expect(mesh.material).toBeInstanceOf(MeshLambertMaterial);
  });

  it("keeps the feet on the floor when the legs get longer or shorter", () => {
    for (const legs of [1, -1]) {
      const { model, mesh } = rig();
      const before = skinned(mesh);
      new Dresser(model, "Female").apply(look({ legs }));
      const after = skinned(mesh);
      expect(after[0].y).toBeCloseTo(0, 5);
      // The hip rises (or drops) by the thigh's and shin's growth together.
      expect(Math.sign(after[2].y - before[2].y)).toBe(legs);
    }
  });

  it("moves the joints with the shape, so the animation pivots in the right places", () => {
    const { model, hips } = rig();
    const restY = hips.position.y;
    const dresser = new Dresser(model, "Female");
    dresser.apply(look({ legs: 1 }));
    expect(hips.position.y).toBeGreaterThan(restY);
    // Going back to the default puts the bones back where they were.
    dresser.apply(newLook());
    expect(hips.position.y).toBeCloseTo(restY, 6);
  });

  it("puts the bones back at rest each time", () => {
    const { model, thigh } = rig();
    const dresser = new Dresser(model, "Female");
    thigh.rotation.x = 1;
    dresser.apply(newLook());
    expect(thigh.quaternion.w).toBeCloseTo(1);
  });

  it("scales the whole character for height", () => {
    const { model, root } = rig();
    new Dresser(model, "Female").apply(look({ height: 1 }));
    expect(root.scale.y).toBeCloseTo(1.06);
  });

  it("has copies of its own meshes, so others sharing them are untouched", () => {
    const { model, mesh } = rig();
    const shared = mesh.geometry;
    new Dresser(model, "Female").apply(look({ hips: 1 }));
    expect(mesh.geometry).not.toBe(shared);
    expect(shared.getAttribute("position").getX(2)).toBeCloseTo(0.1);
  });

  it("dyes a piece of clothing and changes it back", () => {
    const { model, mesh } = rig();
    const dresser = new Dresser(model, "Female");
    const original = mesh.material;
    dresser.apply(look({}, { skirt: "#8c2020" }));
    expect(mesh.material).not.toBe(original);
    expect((mesh.material as MeshLambertMaterial).name).toBe("T_skirt");
    dresser.apply(newLook());
    expect(mesh.material).toBe(original);
  });

  it("recolours guests without reshaping them", () => {
    const { model, mesh } = rig();
    const shared = mesh.geometry;
    dressColors(model, "Female", { skirt: "#24345a" });
    expect(mesh.geometry).toBe(shared);
    expect((mesh.material as MeshLambertMaterial).color.getHexString()).toBe("24345a");
  });
});

describe("clothes on the body", () => {
  /** The rig, plus trousers: one point just outside the hip, skinned to the thigh where the body's is on the hips. */
  function dressedRig() {
    const parts = rig();
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([0.11, 0.86, 0], 3));
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute([1, 0, 0, 0], 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
    const trousers = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: "T_hose" }));
    trousers.name = "Female_Cloth_Trousers";
    parts.root.add(trousers);
    trousers.bind(parts.mesh.skeleton);
    parts.mesh.name = "Female_Body";
    return { ...parts, trousers };
  }

  it("moves cloth with the body under it, not with its own bones", () => {
    const { model, mesh, trousers } = dressedRig();
    new Dresser(model, "Female").apply(look({ hips: 1 }));
    const [, , hip] = skinned(mesh);
    const [cloth] = skinned(trousers);
    // The body's hip point moved out with the hips; the cloth just outside it moved the same way.
    expect(hip.x).toBeGreaterThan(0.1);
    expect(cloth.x - hip.x).toBeCloseTo(0.01, 3);
  });

  it("takes the clothes off to look, and puts them back", () => {
    const { model, mesh, trousers } = dressedRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    dresser.setUndressed(true);
    expect(trousers.visible).toBe(false);
    expect(mesh.visible).toBe(true);
    dresser.setUndressed(false);
    expect(trousers.visible).toBe(true);
  });
});

describe("random looks", () => {
  it("only uses known settings, within range, and its own swatches", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) {
      const rolled = randomLook("Female", random);
      expect(readLook(rolled, "Female")).toEqual(rolled);
      for (const value of Object.values(rolled.sliders)) expect(Math.abs(value)).toBeLessThanOrEqual(0.8);
      expect(rolled.colors.skin).toBeDefined();
    }
  });
});

describe("colours", () => {
  it("moves every skin shade by the same amount", () => {
    const ref = new Color(0.7, 0.35, 0.2);
    const shade = new Color(0.35, 0.175, 0.1);
    const target = new Color(0.35, 0.175, 0.1);
    const moved = toneColor(shade, ref, target);
    expect(moved.r).toBeCloseTo(0.175);
    expect(moved.g).toBeCloseTo(0.0875);
  });

  it("dyes to the new colour, keeping how much darker a material was", () => {
    const ref = new Color(0.5, 0.5, 0.5);
    const darker = new Color(0.25, 0.25, 0.25);
    const dyed = dyeColor(darker, ref, new Color(0.8, 0.2, 0.2));
    expect(dyed.r).toBeCloseTo(0.4);
    expect(dyed.g).toBeCloseTo(0.1);
  });
});

describe("keeping looks", () => {
  it("drops anything unknown or out of range", () => {
    const read = readLook(
      { sliders: { height: 3, bust: -0.5, wings: 1 }, colors: { skin: "#ABCDEF", hair: "red", tail: "#000000" }, hidden: ["apron", "hat"] },
      "Female",
    );
    expect(read).toEqual({ sliders: { height: 1, bust: -0.5 }, colors: { skin: "#abcdef" }, hidden: ["apron"] });
  });

  it("reads both siblings, with a missing one as built", () => {
    const looks = readLooks({ Male: { sliders: { chest: 0.4 }, colors: {}, hidden: [] } });
    expect(looks!.Male.sliders).toEqual({ chest: 0.4 });
    expect(looks!.Female).toEqual(newLook());
    expect(readLooks("nope")).toBeNull();
  });
});

describe("hairstyles", () => {
  /** The rig with two hairstyles on the hips bone: its own, and a long one. */
  function hairRig() {
    const parts = rig();
    const make = (name: string) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([0, 1.5, 0], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([0, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const hair = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: "T_hair_f" }));
      hair.name = name;
      parts.root.add(hair);
      hair.bind(parts.mesh.skeleton);
      return hair;
    };
    return { ...parts, own: make("Female_Hair"), long: make("Female_HairLong") };
  }

  it("shows only the chosen style, starting with the character's own", () => {
    const { model, own, long } = hairRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([own.visible, long.visible]).toEqual([true, false]);
    dresser.apply({ ...newLook(), hairstyle: "long" });
    expect([own.visible, long.visible]).toEqual([false, true]);
  });

  it("gives guests their own hair only", () => {
    const { model, own, long } = hairRig();
    dressColors(model, "Female", {});
    expect([own.visible, long.visible]).toEqual([true, false]);
  });

  it("has no hair mesh for bald, and keeps only known styles", () => {
    expect(hairMeshFor("Male", { hairstyle: "bald" })).toBeNull();
    expect(hairMeshFor("Male", {})).toBe("");
    expect(readLook({ hairstyle: "long" }, "Female")!.hairstyle).toBe("long");
    expect(readLook({ hairstyle: "bob" }, "Female")!.hairstyle).toBeUndefined();
    expect(readLook({ hairstyle: "mohawk" }, "Female")!.hairstyle).toBeUndefined();
  });
});

describe("a fuller bust", () => {
  it("drops and comes forwards as it grows, but not as it shrinks", () => {
    const bigger = activeTerms("Female", { bust: 1 }).get("Bust")![0];
    expect(bigger.shift![1]).toBeLessThan(0);
    expect(bigger.shift![2]).toBeLessThan(0);
    const smaller = activeTerms("Female", { bust: -1 }).get("Bust")![0];
    expect(smaller.shift).toEqual([0, 0, 0]);
  });

  it("swells each breast about its own middle, and only forwards towards the cleavage", () => {
    const term = { grow: [1, 0, 1] as [number, number, number], lobes: [0.07, 0, 0] as const };
    const out = new Vector3();
    // The middle of a breast stays put; a point 2 cm out from it goes to 4 cm out, on either side.
    expect(reshape([term], new Vector3(0.07, 0, 0), out).x).toBeCloseTo(0.07);
    expect(reshape([term], new Vector3(0.09, 0, 0), out).x).toBeCloseTo(0.11);
    expect(reshape([term], new Vector3(-0.09, 0, 0), out).x).toBeCloseTo(-0.11);
    // Between a breast's middle and the cleavage, points keep their place across and only come forwards.
    reshape([term], new Vector3(0.01, 0, -0.04), out);
    expect(out.x).toBeCloseTo(0.01);
    expect(out.z).toBeCloseTo(-0.08);
    expect(reshape([term], new Vector3(0, 0, -0.04), out).x).toBe(0);
  });

  it("rounds the inner side out towards the cleavage with inner fullness, never past the middle", () => {
    const full = { grow: [1, 0, 0] as [number, number, number], lobes: [0.08, 0, 0] as const, inner: 1 };
    const out = new Vector3();
    // Grown twice as wide, the inner side follows the curve (x / 8 cm)^2: 4 cm in goes to 2 cm.
    expect(reshape([full], new Vector3(0.04, 0, 0), out).x).toBeCloseTo(0.02);
    expect(reshape([full], new Vector3(-0.04, 0, 0), out).x).toBeCloseTo(-0.02);
    // The middle of the breast and the cleavage stay put.
    expect(reshape([full], new Vector3(0.08, 0, 0), out).x).toBeCloseTo(0.08);
    expect(reshape([full], new Vector3(0, 0, 0), out).x).toBe(0);
    // Half of it goes half way; negative draws the inner side in towards the middle instead.
    expect(reshape([{ ...full, inner: 0.5 }], new Vector3(0.04, 0, 0), out).x).toBeCloseTo(0.03);
    expect(reshape([{ ...full, inner: -1 }], new Vector3(0.02, 0, 0), out).x).toBeCloseTo(0.04);
  });

  it("gives inner fullness to the breast terms, 0.6 of the way round as built", () => {
    const inner = (value?: number) => activeTerms("Female", { bust: 1, bustInner: value ?? 0 }).get("Bust")!.map((t) => t.inner);
    expect(inner().every((v) => v === 0.6)).toBe(true);
    expect(inner(1).every((v) => v === 1)).toBe(true);
    expect(inner(-1).every((v) => v === -1)).toBe(true);
    expect(inner(0.5)[0]).toBeCloseTo(0.8);
    expect(inner(-0.375)[0]).toBeCloseTo(0);
  });

  it("swells a glute round into the cleft, never past the body's middle", () => {
    // The joint is 6.5 cm from the middle; growing twice as wide, a point on the outer side goes twice as far out.
    const term = { grow: [1, 0, 0] as [number, number, number], midline: 0.065 };
    const out = new Vector3();
    expect(reshape([term], new Vector3(-0.03, 0, 0), out).x).toBeCloseTo(-0.06);
    // On the inner side it follows mid * (1 - (1 - t)^2): halfway to the middle it goes three quarters of the way.
    expect(reshape([term], new Vector3(0.0325, 0, 0), out).x).toBeCloseTo(0.04875);
    // Close to the middle it closes in on it but stays on its own side.
    expect(reshape([term], new Vector3(0.06, 0, 0), out).x).toBeLessThan(0.065);
    expect(reshape([term], new Vector3(0.06, 0, 0), out).x).toBeGreaterThan(0.06);
    // The other glute mirrors it.
    expect(reshape([{ ...term, midline: -0.065 }], new Vector3(-0.0325, 0, 0), out).x).toBeCloseTo(-0.04875);
    // Shrinking draws it away from the middle as before.
    expect(reshape([{ grow: [-0.5, 0, 0] as [number, number, number], midline: 0.065 }], new Vector3(0.04, 0, 0), out).x).toBeCloseTo(0.02);
  });

  it("stretches the neck by raising the head while the neck's base stays in the shoulders", () => {
    const active = activeTerms("Female", { neckLength: 1 });
    const out = new Vector3();
    // The torso carries the head's joint, 39 cm above its own, up by 2.5 cm; its own skin stays put.
    expect(reshape(active.get("Torso")!, new Vector3(0, 0.39, 0), out).y).toBeCloseTo(0.415);
    expect(reshape(active.get("Torso")!, new Vector3(0, 0.37, 0), out).y).toBeCloseTo(0.37);
    // On the head, the neck's base comes back down by the joint's 2.5 cm, so it stays where it was...
    expect(reshape(active.get("Head")!, new Vector3(0, -0.035, 0), out).y).toBeCloseTo(-0.06);
    // ...and from under the chin up, the head moves whole with its joint.
    expect(reshape(active.get("Head")!, new Vector3(0, 0.08, 0), out).y).toBeCloseTo(0.08);
  });

  it("grows a band of heights fully in its middle and not at all past its ends", () => {
    const band = [0, -0.06, -0.14, -0.27] as const;
    expect(bandWeight(band, -0.1)).toBe(1);
    expect(bandWeight(band, 0.05)).toBe(0);
    expect(bandWeight(band, -0.3)).toBe(0);
    // Halfway up the easing at the top, the smooth curve gives a half.
    expect(bandWeight(band, -0.03)).toBeCloseTo(0.5);
    const calf = { grow: [1, 0, 0] as [number, number, number], band };
    const out = new Vector3();
    expect(reshape([calf], new Vector3(0.05, -0.1, 0), out).x).toBeCloseTo(0.1);
    expect(reshape([calf], new Vector3(0.05, -0.35, 0), out).x).toBeCloseTo(0.05);
  });

  it("fades out smoothly, with no edge where it stops", () => {
    const fading = [{ grow: [1, 0, 0] as [number, number, number], fade: [0, 0.1] as const }];
    const out = new Vector3();
    // A quarter of the way in, the smooth curve gives less than the straight line's quarter.
    expect(reshape(fading, new Vector3(1, 0.075, 0), out).x).toBeCloseTo(1 + 0.15625);
  });
});

describe("cup sizes", () => {
  const bust = LOOK_OPTIONS.Female.sliders.find((def) => def.id === "bust")!;

  it("runs from A to Q, with C as built", () => {
    expect(bust.stops).toBe(CUPS);
    expect(CUPS.labels[0]).toBe("A");
    expect(CUPS.labels[CUPS.labels.length - 1]).toBe("Q");
    expect(CUPS.labels[nearestStop(CUPS, 0)]).toBe("C");
  });

  it("puts A at -1, B halfway down, and D to Q evenly above", () => {
    expect(stopValue(CUPS, 0)).toBe(-1);
    expect(stopValue(CUPS, 1)).toBe(-0.5);
    expect(stopValue(CUPS, 3)).toBeCloseTo(1 / 14);
    expect(stopValue(CUPS, 16)).toBe(1);
    for (let i = 0; i < CUPS.labels.length; i++) expect(nearestStop(CUPS, stopValue(CUPS, i))).toBe(i);
  });

  it("rolls random busts on a cup, and only up to about a J", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 200; i++) {
      const value = randomLook("Female", random).sliders.bust ?? 0;
      const cup = nearestStop(CUPS, value);
      expect(stopValue(CUPS, cup)).toBeCloseTo(value);
      expect(CUPS.labels[cup] <= "J").toBe(true);
    }
  });

  it("spreads the arms for a fuller bust", () => {
    expect(armSpreadFor({ bust: 1 })).toBeGreaterThan(armSpreadFor({}));
  });
});

describe("bust shape and height", () => {
  it("moves a whole breast for Height, reaching past where its weight thins out", () => {
    const term = { grow: [0, 0, 0] as [number, number, number], shift: [0, 0.03, 0] as [number, number, number], reach: 0.5 };
    const out = new Vector3();
    // Where the bone holds a quarter of the point, the move counts as half: after the caller's weighting, 0.5.
    const quarter = reshape([term], new Vector3(), out, 0.25).y * 0.25;
    expect(quarter).toBeCloseTo(0.015);
    // Held fully, it moves fully; Lift, without reach, moves only as far as the weight.
    expect(reshape([term], new Vector3(), out, 1).y).toBeCloseTo(0.03);
    expect(reshape([{ grow: [0, 0, 0], shift: [0, 0.03, 0] }], new Vector3(), out, 0.25).y * 0.25).toBeCloseTo(0.0075);
  });

  it("sets breasts apart and turns them outwards, each to its own side", () => {
    const out = new Vector3();
    expect(reshape([{ grow: [0, 0, 0], apart: 0.01 }], new Vector3(0.05, 0, 0), out).x).toBeCloseTo(0.06);
    expect(reshape([{ grow: [0, 0, 0], apart: 0.01 }], new Vector3(-0.05, 0, 0), out).x).toBeCloseTo(-0.06);
    // Turning moves the front (-z) of a breast most, and the back of it not at all.
    expect(reshape([{ grow: [0, 0, 0], turn: 0.02 }], new Vector3(0.05, 0, -0.06), out).x).toBeCloseTo(0.07);
    expect(reshape([{ grow: [0, 0, 0], turn: 0.02 }], new Vector3(0.05, 0, 0.02), out).x).toBeCloseTo(0.05);
  });

  it("has teardrop first, as built, and gives shapes more to work with as the cup grows", () => {
    const shapes = LOOK_OPTIONS.Female.bustShapes;
    expect(shapes[0].id).toBe("teardrop");
    expect(shapes[0].terms).toEqual([]);
    expect(shapes.map((s) => s.id)).toEqual(["teardrop", "round", "bell", "eastwest", "athletic", "relaxed", "sideset", "slender"]);
    expect(shapeAmount(-1)).toBeLessThan(shapeAmount(0));
    expect(shapeAmount(1)).toBeGreaterThan(shapeAmount(0));
    expect(activeTerms("Female", {}, "teardrop").size).toBe(0);
    expect(activeTerms("Female", {}, "athletic").get("Bust")).toHaveLength(1);
  });

  it("keeps a known shape in the look, leaving the default out, and copies it", () => {
    expect(readLook({ bustShape: "bell" }, "Female")!.bustShape).toBe("bell");
    expect(readLook({ bustShape: "teardrop" }, "Female")!.bustShape).toBeUndefined();
    expect(readLook({ bustShape: "cone" }, "Female")!.bustShape).toBeUndefined();
    expect(copyLook({ ...newLook(), bustShape: "round" }).bustShape).toBe("round");
  });
});

describe("nipples in the look", () => {
  it("keeps a known type, leaving the default out, and copies it", () => {
    expect(readLook({ nipples: "puffy" }, "Female")!.nipples).toBe("puffy");
    expect(readLook({ nipples: "neat" }, "Female")!.nipples).toBeUndefined();
    expect(readLook({ nipples: "pierced" }, "Female")!.nipples).toBeUndefined();
    expect(readLook({ nipples: "puffy" }, "Male")!.nipples).toBeUndefined();
    expect(copyLook({ ...newLook(), nipples: "wide" }).nipples).toBe("wide");
  });

  it("has sliders for their sizes and a colour that follows the skin", () => {
    const ids = LOOK_OPTIONS.Female.sliders.filter((def) => def.group === "Nipples").map((def) => def.id);
    expect(ids).toEqual(["nippleSize", "areolaSize"]);
    expect(LOOK_OPTIONS.Female.colors.find((def) => def.id === "nipples")?.follows).toBe("skin");
  });
});

describe("outfits", () => {
  /** The rig with a dirndl's cloth mesh beside the tavern dress, both on the hips bone. */
  function outfitRig() {
    const parts = rig();
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([0, 0.9, 0.1], 3));
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute([0, 0, 0, 0], 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
    const dirndl = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: "T_skirt" }));
    dirndl.name = "Female_ClothDirndl";
    parts.root.add(dirndl);
    dirndl.bind(parts.mesh.skeleton);
    return { ...parts, dirndl };
  }

  it("shows only the chosen outfit's cloth, starting with the character's own", () => {
    const { model, mesh, dirndl } = outfitRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([mesh.visible, dirndl.visible]).toEqual([true, false]);
    dresser.apply({ ...newLook(), outfit: "dirndl" });
    expect([mesh.visible, dirndl.visible]).toEqual([false, true]);
  });

  it("dresses guests in the character's own outfit, unless another is named", () => {
    const { model, mesh, dirndl } = outfitRig();
    dressColors(model, "Female", {});
    expect([mesh.visible, dirndl.visible]).toEqual([true, false]);
    dressColors(model, "Female", {}, "dirndl");
    expect([mesh.visible, dirndl.visible]).toEqual([false, true]);
  });

  it("keeps the pirate's rig for guests: never offered, rolled or loaded for a player", () => {
    for (const body of ["Female", "Male"] as const) {
      expect(outfitOf(body, { outfit: "pirate" }).mesh).toBe("Pirate");
      expect(playerOutfits(body).map((o) => o.id)).not.toContain("pirate");
      expect(readLook({ outfit: "pirate" }, body)!.outfit).toBeUndefined();
      let seed = 0;
      const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 50; i++) expect(randomLook(body, random).outfit).not.toBe("pirate");
    }
  });

  it("colours guests' pirate rigs in a few ways, all from the body's own clothes colours", () => {
    for (const body of ["Female", "Male"] as const) {
      const clothes = LOOK_OPTIONS[body].colors.filter((c) => c.tab === "clothes" || c.id === "hair").map((c) => c.id);
      const looks = Array.from({ length: PIRATE_LOOKS }, (_, i) => pirateGuestColors(body, i));
      for (const look of looks) for (const id of Object.keys(look)) expect(clothes, `${body}: ${id}`).toContain(id);
      expect(new Set(looks.map((look) => JSON.stringify(look))).size).toBe(PIRATE_LOOKS);
      expect(pirateGuestColors(body, PIRATE_LOOKS)).toEqual(looks[0]);
    }
  });

  it("puts an outfit on in its own colours, keeping everything that isn't clothes", () => {
    const before: Look = { ...newLook(), colors: { skin: "#c68a64", skirt: "#24345a", belt: "#2b2b2b" }, hairstyle: "long" };
    const dirndl = wearOutfit("Female", before, "dirndl");
    expect(dirndl.outfit).toBe("dirndl");
    expect(dirndl.colors.skin).toBe("#c68a64");
    expect(dirndl.colors.belt).toBeUndefined();
    expect(dirndl.colors.apron).toBe(outfitOf("Female", dirndl).preset.apron);
    expect(dirndl.hairstyle).toBe("long");
    // Back to the tavern dress: the model's own colours again, and nothing stored for the outfit.
    const tavern = wearOutfit("Female", dirndl, "tavern");
    expect(tavern.outfit).toBeUndefined();
    expect(tavern.colors).toEqual({ skin: "#c68a64" });
  });

  it("lists only clothes colours each body has, and keeps only known outfits", () => {
    for (const body of ["Female", "Male"] as const) {
      const clothes = LOOK_OPTIONS[body].colors.filter((c) => c.tab === "clothes").map((c) => c.id);
      for (const outfit of LOOK_OPTIONS[body].outfits) {
        for (const id of [...outfit.colors, ...Object.keys(outfit.preset)]) expect(clothes, `${outfit.id}: ${id}`).toContain(id);
      }
    }
    expect(readLook({ outfit: "priestess" }, "Female")!.outfit).toBe("priestess");
    expect(readLook({ outfit: "tavern" }, "Female")!.outfit).toBeUndefined();
    expect(readLook({ outfit: "ballgown" }, "Female")!.outfit).toBeUndefined();
    expect(copyLook({ ...newLook(), outfit: "dirndl" }).outfit).toBe("dirndl");
  });
});

describe("legwear", () => {
  /** The rig with her seat and thigh bands of stockings and the garter on the cloth, the sock cuff on the shoes and skin on the body. */
  function legRig() {
    const parts = rig();
    const piece = (name: string, material: string) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([-0.1, 0.6, 0.05], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([1, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const mesh = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: material }));
      mesh.name = name;
      parts.root.add(mesh);
      mesh.bind(parts.mesh.skeleton);
      return mesh;
    };
    const seat = piece("Female_Cloth_1", "T_hose");
    const thigh = piece("Female_Cloth_2", "T_hose_thigh");
    const garter = piece("Female_Cloth_3", "T_garter");
    const cuff = piece("Female_Shoes", "T_hose");
    const skin = piece("Female_Body", "T_skin_f");
    return { ...parts, seat, thigh, garter, cuff, skin };
  }

  it("comes with each outfit, and the pirate's rig has none", () => {
    expect(legwearOf("Female", {})!.id).toBe("tights");
    expect(legwearOf("Female", { outfit: "dirndl" })!.id).toBe("noshow");
    expect(legwearOf("Female", { outfit: "dirndl", legwear: "kneehigh" })!.id).toBe("kneehigh");
    expect(legwearOf("Female", { outfit: "pirate", legwear: "tights" })).toBeNull();
    expect(legwearOf("Male", {})).toBeNull();
  });

  it("shows the bands a style reaches, and paints a missing sock cuff in skin", () => {
    const { model, seat, thigh, garter, cuff, skin } = legRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([seat.visible, thigh.visible, garter.visible]).toEqual([true, true, false]);
    expect((cuff.material as MeshLambertMaterial).name).toBe("T_hose");
    dresser.apply({ ...newLook(), legwear: "garter" });
    expect([seat.visible, thigh.visible, garter.visible]).toEqual([false, true, true]);
    dresser.apply({ ...newLook(), legwear: "leggings" });
    expect(cuff.material).toBe(skin.material);
    dresser.apply({ ...newLook(), legwear: "ankle" });
    expect([seat.visible, thigh.visible]).toEqual([false, false]);
    expect((cuff.material as MeshLambertMaterial).name).toBe("T_hose");
    // Rolled down: every band comes off, and the cuff goes to skin.
    dresser.apply({ ...newLook(), legwear: "garter" });
    dresser.setStripped(["stockings"]);
    expect([seat.visible, thigh.visible, garter.visible]).toEqual([false, false, false]);
    expect(cuff.material).toBe(skin.material);
  });

  it("dresses guests in their outfit's legwear unless another is named", () => {
    const { model, seat, garter } = legRig();
    dressColors(model, "Female", {});
    expect([seat.visible, garter.visible]).toEqual([true, false]);
    dressColors(model, "Female", {}, undefined, "garter");
    expect([seat.visible, garter.visible]).toEqual([false, true]);
  });

  it("goes back to the outfit's own when another outfit goes on, and keeps only known styles", () => {
    expect(wearOutfit("Female", { ...newLook(), legwear: "crew" }, "dirndl").legwear).toBeUndefined();
    expect(readLook({ legwear: "overknee" }, "Female")!.legwear).toBe("overknee");
    expect(readLook({ legwear: "fishnets" }, "Female")!.legwear).toBeUndefined();
    expect(copyLook({ ...newLook(), legwear: "capri" }).legwear).toBe("capri");
  });
});
