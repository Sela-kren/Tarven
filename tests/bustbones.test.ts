import { describe, expect, it } from "vitest";
import { Object3D } from "three";
import { bustFamilyIndices, isBustFamily, isBustSoft } from "../src/game/bustbones";

describe("bust bones", () => {
  it("knows the breasts' soft bones", () => {
    for (const part of ["Outer", "Tip", "Top", "Side"]) for (const side of ["L", "R"]) {
      expect(isBustSoft(`Bust${part}_${side}`)).toBe(true);
      expect(isBustFamily(`Bust${part}_${side}`)).toBe(true);
    }
    expect(isBustSoft("Bust")).toBe(false);
    expect(isBustFamily("Bust")).toBe(true);
    expect(isBustFamily("BustOuter")).toBe(false);
    expect(isBustFamily("Torso")).toBe(false);
  });

  it("finds the family in a skeleton by the body's name", () => {
    const bones = ["Female_Torso", "Female_Bust", "Female_BustOuter_L", "Female_BustTip_R", "Male_Bust", "Female_Glute_L"].map((name) => {
      const bone = new Object3D();
      bone.name = name;
      return bone;
    });
    expect([...bustFamilyIndices(bones, "Female")]).toEqual([1, 2, 3]);
  });
});
