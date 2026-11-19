import { describe, expect, it } from "vitest";
import { Bone, BufferGeometry, Float32BufferAttribute, Group, MeshLambertMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute } from "three";
import { Dresser, newLook, wearOutfit } from "../src/game/appearance";
import { LINGERIE_MATERIAL } from "../src/game/lingerie";

/** Her in the tee, on a tiny rig: one bone, her underwear patch on her body, and the tee over it. */
function teeRig() {
  const model = new Group();
  const root = new Group();
  root.name = "Female";
  model.add(root);
  const bone = new Bone();
  bone.name = "Female_Hips";
  root.add(bone);
  root.updateMatrixWorld(true);
  const mesh = (name: string, material: string, z: number) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([0.06, 1.1, z, 0.1, 1.15, z, 0.08, 1.2, z], 3));
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute(new Array(12).fill(0), 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    const m = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: material }));
    m.name = name;
    root.add(m);
    m.bind(new Skeleton([bone]));
    return m;
  };
  const lingerie = mesh("Female_Body", LINGERIE_MATERIAL, 0.1);
  mesh("Female_ClothTee", "T_tee", 0.12);
  return { model, lingerie };
}

describe("her bra under the tee", () => {
  it("stays hidden under the tee, and shows once the tee is pulled off her breasts as she shows", () => {
    const { model, lingerie } = teeRig();
    const dresser = new Dresser(model, "Female");
    const look = wearOutfit("Female", newLook(), "tee");
    expect(look.bra).toBeTruthy();
    // Her briefs are drawn on the same patch: in her painted-on braies, only the bra decides whether it shows.
    delete look.briefs;
    dresser.apply(look);
    expect(lingerie.visible).toBe(false);
    for (const dir of ["down", "up"] as const) {
      dresser.setPull({ ids: ["tee"], dir }, 1);
      expect(lingerie.visible, dir).toBe(true);
      dresser.setPull(null, 0);
      expect(lingerie.visible, dir).toBe(false);
    }
  });
});
