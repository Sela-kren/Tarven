import { describe, expect, it } from "vitest";
import { LOOK_OPTIONS, playerOutfits } from "../src/game/appearance";
import { DARES, stripPiece } from "../src/game/banter";
import { piecesOff, stripLadder, stripStages, WARDROBE, type WardrobeBody } from "../src/game/wardrobe";

const BODIES: WardrobeBody[] = ["Female", "Male"];

describe("the wardrobe", () => {
  it("strips her in eight looks, from dressed down to nothing", () => {
    expect(stripLadder("Female").map((g) => g.id)).toEqual(["apron", "belt", "bodice", "skirt", "stockings", "blouse", "smalls"]);
    expect(stripStages("Female")).toBe(8);
  });

  it("strips him in four looks, keeping his belt on", () => {
    expect(stripLadder("Male").map((g) => g.id)).toEqual(["tunic", "trousers", "smalls"]);
    expect(stripStages("Male")).toBe(4);
  });

  it("takes the smallclothes off last, and never the shoes", () => {
    for (const body of BODIES) {
      const ids = stripLadder(body).map((g) => g.id);
      expect(ids.at(-1)).toBe("smalls");
      expect(ids).not.toContain("shoes");
      expect(ids).not.toContain("boots");
    }
  });

  it("takes off outer layers before what's under them", () => {
    for (const body of BODIES) {
      const layers = stripLadder(body).map((g) => g.layer);
      const order = ["accessory", "outer", "legwear", "under", "smallclothes"];
      expect(layers.map((l) => order.indexOf(l))).toEqual([...layers.map((l) => order.indexOf(l))].sort((a, b) => a - b));
    }
  });

  it("knows every piece of clothing the customizer can colour, so new clothes can't be left out", () => {
    for (const body of BODIES) {
      const clothes = LOOK_OPTIONS[body].colors.filter((c) => c.tab === "clothes").map((c) => c.id);
      expect(WARDROBE[body].map((g) => g.id).sort()).toEqual([...clothes].sort());
    }
  });

  it("gives every garment a player can wear something to say, written or not", () => {
    for (const body of BODIES) {
      for (const outfit of playerOutfits(body)) {
        for (const garment of stripLadder(body, outfit.id)) expect(DARES[garment.id], `${outfit.id}: ${garment.id}`).toBeDefined();
      }
    }
    const made = stripPiece({ id: "cloak", label: "cloak" });
    expect(made.accept).toBe("Let them have your cloak");
    expect(made.dare).toContain("cloak");
  });

  it("strips each of her outfits in its own order, keeping the jewellery on", () => {
    expect(stripLadder("Female", "dirndl").map((g) => g.id)).toEqual(["apron", "ribbons", "bodice", "skirt", "blouse", "smalls"]);
    expect(stripLadder("Female", "priestess").map((g) => g.id)).toEqual(["sleeves", "top", "drapes", "girdle", "smalls"]);
    expect(stripLadder("Female", "tavern")).toEqual(stripLadder("Female"));
    expect(piecesOff("Female", 2, "priestess")).toEqual(["sleeves", "top"]);
    expect(stripStages("Female", "priestess")).toBe(6);
  });

  it("only goes for what the outfit has", () => {
    for (const body of BODIES) {
      for (const outfit of LOOK_OPTIONS[body].outfits) {
        for (const garment of stripLadder(body, outfit.id)) expect(outfit.colors, `${outfit.id}: ${garment.id}`).toContain(garment.id);
      }
    }
  });

  it("lists what's off at each stage", () => {
    expect(piecesOff("Female", 0)).toEqual([]);
    expect(piecesOff("Female", 3)).toEqual(["apron", "belt", "bodice"]);
    expect(piecesOff("Female", 99)).toHaveLength(7);
  });
});
