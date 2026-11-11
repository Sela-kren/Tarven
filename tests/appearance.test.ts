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
  copyLook,
  dressColors,
  Dresser,
  dyeColor,
  hairMeshFor,
  LOOK_OPTIONS,
  newLook,
  outfitOf,
  randomLook,
  readLook,
  readLooks,
  reshape,
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
    expect(terms.get("Bust")![0].grow).toEqual([0.35, 0.55, 1.6]);
    // Shrinking has its own, smaller amounts.
    expect(activeTerms("Female", { bust: -1 }).get("Bust")![0].grow).toEqual([-0.12, -0.15, -0.45]);
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
    // A point on the bone's joint still moves by the whole shift.
    const out = reshape([bigger], new Vector3(), new Vector3());
    expect(out.y).toBeCloseTo(-0.03);
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

  it("dresses guests in the character's own outfit only", () => {
    const { model, mesh, dirndl } = outfitRig();
    dressColors(model, "Female", {});
    expect([mesh.visible, dirndl.visible]).toEqual([true, false]);
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
