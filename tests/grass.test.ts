import { describe, expect, it } from "vitest";
import { Mesh } from "three";
import { bladeKind, flowerSprite, GRASS, GrassField, grassSprite, MAX_PUSHERS, plantGrass } from "../src/game/grass";
import { buildStreet } from "../src/game/street";

/** A steady random source, for the same field each run. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const area = { minX: 0, maxX: 20, minZ: 0, maxZ: 10 };
const road = { minX: 0, maxX: 20, minZ: 4, maxZ: 6 };

describe("planting the grass", () => {
  it("covers the ground at its density, and never the bare ground", () => {
    const blades = plantGrass(area, [road], seeded(1));
    const open = 20 * 8;
    expect(blades.length).toBeGreaterThan(open * GRASS.density * 0.9);
    expect(blades.length).toBeLessThan(open * GRASS.density * 1.1);
    for (const b of blades) {
      expect(b.z > road.minZ && b.z < road.maxZ).toBe(false);
      expect(b.x).toBeGreaterThanOrEqual(area.minX);
      expect(b.x).toBeLessThanOrEqual(area.maxX);
    }
  });

  it("is the same field from the same seed", () => {
    expect(plantGrass(area, [road], seeded(7))).toEqual(plantGrass(area, [road], seeded(7)));
  });

  it("makes a few accents and flowers among the plain blades, the tall accents tallest", () => {
    const blades = plantGrass(area, [], seeded(3));
    const share = (kind: number) => blades.filter((b) => b.kind === kind).length / blades.length;
    expect(share(0)).toBeGreaterThan(0.8);
    expect(share(1)).toBeCloseTo(GRASS.flower.chance, 1);
    expect(share(3)).toBeCloseTo(GRASS.accent1.chance, 1);
    const tallest = (kind: number) => Math.max(...blades.filter((b) => b.kind === kind).map((b) => b.height));
    expect(tallest(3)).toBeGreaterThan(tallest(0));
    expect(tallest(2)).toBeLessThan(tallest(0));
  });

  it("picks kinds by the chances in order", () => {
    expect(bladeKind(0)).toBe(3);
    expect(bladeKind(GRASS.accent1.chance + 0.001)).toBe(2);
    expect(bladeKind(GRASS.accent1.chance + GRASS.accent2.chance + 0.001)).toBe(1);
    expect(bladeKind(0.99)).toBe(0);
  });
});

describe("the grass sprites", () => {
  it("draw blades from the bottom row up, with clear texels round them", () => {
    const px = grassSprite([[8, 8, 1, 1]]);
    expect(px[(0 * 16 + 8) * 4 + 3]).toBe(255);
    expect(px[(0 * 16 + 0) * 4 + 3]).toBe(0);
    // Clear texels keep a mid shade so the soft edge doesn't go dark.
    expect(px[0]).toBe(204);
  });

  it("mark a flower's petals and middle in their own channels", () => {
    const px = flowerSprite();
    let petals = 0;
    let middles = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 1] === 255) petals++;
      if (px[i + 2] === 255) middles++;
    }
    expect(petals).toBe(12);
    expect(middles).toBe(1);
  });
});

describe("the grass field", () => {
  it("is cut into tiles the camera can skip, every blade in one of them", () => {
    const blades = plantGrass({ minX: 0, maxX: 30, minZ: 0, maxZ: 20 }, [], seeded(2));
    const field = new GrassField(blades);
    const tiles = field.root.children as Mesh[];
    expect(tiles.length).toBe(6);
    const drawn = tiles.reduce((n, t) => n + (t.geometry as unknown as { instanceCount: number }).instanceCount, 0);
    expect(drawn).toBe(blades.length);
    for (const t of tiles) expect(t.geometry.boundingSphere).not.toBeNull();
  });

  it("takes at most its share of people pushing through it", () => {
    const field = new GrassField(plantGrass(area, [], seeded(4)));
    const crowd = Array.from({ length: MAX_PUSHERS + 5 }, (_, i) => ({ x: i, z: 0 }));
    field.update(3, crowd);
    const uniforms = (field as unknown as { uniforms: Record<string, { value: unknown }> }).uniforms;
    expect(uniforms.uPushCount.value).toBe(MAX_PUSHERS);
    expect(uniforms.uTime.value).toBe(3);
  });

  it("grows in the town, on the verges and the fields but not on the high street", () => {
    const street = buildStreet();
    expect(street.grass.bladeCount).toBeGreaterThan(20000);
    expect(street.root.getObjectByName("Street_grass")).toBeDefined();
  });
});
