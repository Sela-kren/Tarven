import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute } from "three";
import {
  arousalOf,
  DISC_RINGS,
  DISC_SPOKES,
  easeArousal,
  NIPPLE_TYPES,
  nippleProfile,
  readDiscs,
  shapeDisc,
  skinUnder,
  tentHeight,
} from "../src/game/nipples";

const type = (id: string) => NIPPLE_TYPES.find((t) => t.id === id)!;
/** How far the nipple stands off the areola around its base. */
const tip = (id: string, arousal: number) => {
  const rings = nippleProfile(type(id), 0, 0, arousal);
  return rings[0].h - rings[3].h;
};

describe("nipple types", () => {
  it("has neat first, then puffy, wide and inverted", () => {
    expect(NIPPLE_TYPES.map((t) => t.id)).toEqual(["neat", "puffy", "wide", "inverted"]);
  });

  it("stands every nipple taller as she's aroused", () => {
    for (const t of NIPPLE_TYPES) expect(tip(t.id, 1)).toBeGreaterThan(tip(t.id, 0) + 0.002);
  });

  it("tucks an inverted nipple in when she's calm, and brings it out when she's aroused", () => {
    expect(tip("inverted", 0)).toBeLessThan(0);
    expect(tip("inverted", 1)).toBeGreaterThan(0);
  });

  it("raises a puffy areola, and gives a wide one the widest edge", () => {
    const edge = (id: string) => nippleProfile(type(id), 0, 0, 0)[DISC_RINGS].r;
    expect(nippleProfile(type("puffy"), 0, 0, 0)[3].h).toBeGreaterThan(nippleProfile(type("neat"), 0, 0, 0)[3].h + 0.002);
    expect(edge("wide")).toBeGreaterThan(Math.max(edge("neat"), edge("puffy"), edge("inverted")));
  });

  it("draws the areola in as she's aroused, and sizes it and the nipple by their sliders", () => {
    const edge = (areola: number, arousal: number) => nippleProfile(type("neat"), 0, areola, arousal)[DISC_RINGS].r;
    expect(edge(0, 1)).toBeLessThan(edge(0, 0));
    expect(edge(1, 0)).toBeGreaterThan(edge(0, 0));
    expect(edge(-1, 0)).toBeLessThan(edge(0, 0));
    expect(nippleProfile(type("neat"), 1, 0, 0)[0].h).toBeGreaterThan(tip("neat", 0));
  });

  it("goes out from the tip to the edge, and the edge lies on the skin", () => {
    for (const t of NIPPLE_TYPES) {
      const rings = nippleProfile(t, -1, -1, 0.5);
      for (let k = 1; k < rings.length; k++) expect(rings[k].r).toBeGreaterThan(rings[k - 1].r);
      expect(rings[DISC_RINGS].h).toBe(0);
    }
  });
});

describe("how aroused she shows", () => {
  it("follows her breasts' desire, or a duel's pleasure and state", () => {
    expect(arousalOf(0.3)).toBeCloseTo(0.3);
    expect(arousalOf(0.3, { state: "calm", pleasure: 0.5 })).toBeCloseTo(0.5);
    expect(arousalOf(0.1, { state: "aroused", pleasure: 0.2 })).toBeCloseTo(0.6);
    expect(arousalOf(0, { state: "edge", pleasure: 0.7 })).toBe(1);
    expect(arousalOf(2)).toBe(1);
  });

  it("stiffens faster than it softens", () => {
    expect(easeArousal(0, 1, 1)).toBeCloseTo(0.5);
    expect(easeArousal(1, 0, 1)).toBeCloseTo(0.85);
    expect(easeArousal(0.4, 0.45, 1)).toBeCloseTo(0.45);
  });
});

/**
 * One disc as the model has it, on a ball of skin 5 cm across facing forwards (-z): the tip at the front, then
 * rings out to 1.3 cm, each corner with its ring and spoke in its UVs as glTF stores them.
 */
function discOnBall() {
  const centre = [0.07, 1.15, 0];
  const radius = 0.05;
  const lift = 0.0008;
  const positions: number[] = [];
  const uvs: number[] = [];
  const add = (ring: number, spoke: number) => {
    const across = (0.013 * ring) / DISC_RINGS;
    const angle = (2 * Math.PI * spoke) / DISC_SPOKES;
    // A point on the ball this far across from the front, lifted off it.
    const x = across * Math.cos(angle);
    const y = across * Math.sin(angle);
    const depth = Math.sqrt(radius * radius - x * x - y * y);
    const out = (radius + lift) / radius;
    positions.push(centre[0] + x * out, centre[1] + y * out, centre[2] - depth * out);
    uvs.push(ring / DISC_RINGS, 1 - spoke / DISC_SPOKES);
  };
  add(0, 0);
  for (let ring = 1; ring <= DISC_RINGS; ring++) for (let spoke = 0; spoke < DISC_SPOKES; spoke++) add(ring, spoke);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  return { geometry, bind: Float32Array.from(positions), centre, radius, lift };
}

describe("shaping a disc", () => {
  it("finds the disc, its tip and its edge", () => {
    const { geometry, bind } = discOnBall();
    const discs = readDiscs(geometry, bind);
    expect(discs).toHaveLength(1);
    expect(discs[0].verts.length).toBe(1 + DISC_RINGS * DISC_SPOKES);
    expect(discs[0].tip).toBe(0);
    expect(discs[0].rest).toBeCloseTo(0.013, 3);
  });

  it("stands the nipple out along the skin's normal, and keeps the areola's edge on the skin", () => {
    const { geometry, bind, centre, radius, lift } = discOnBall();
    const [disc] = readDiscs(geometry, bind);
    const profile = nippleProfile(type("neat"), 0, 0, 1);
    const out = new Float32Array(bind.length);
    // Laid on the skin under the disc: back down by the gap it was built with.
    const skin = skinUnder([disc], bind);
    const { lift: off } = shapeDisc(disc, skin, profile, out);
    expect(off).toBeGreaterThan(lift);
    // The tip comes forwards (-z) by the nipple's height, over the lift.
    expect(skin[2] - out[2]).toBeCloseTo(profile[0].h + off, 4);
    // The edge lies on the ball, lifted off it.
    for (const v of disc.edge) {
      const d = Math.hypot(out[v * 3] - centre[0], out[v * 3 + 1] - centre[1], out[v * 3 + 2] - centre[2]);
      expect(d).toBeCloseTo(radius + off, 3);
    }
  });

  it("tucks an inverted nipple in, and returns the disc's forward normal", () => {
    const { geometry, bind } = discOnBall();
    const [disc] = readDiscs(geometry, bind);
    const out = new Float32Array(bind.length);
    const profile = nippleProfile(type("inverted"), 0, 0, 0);
    const { normal: [nx, ny, nz], lift } = shapeDisc(disc, bind, profile, out);
    // In behind the skin around it: the tip sits back by as much as it's tucked in, less the lift.
    expect(profile[0].h + lift).toBeLessThan(0);
    expect(out[2]).toBeGreaterThan(bind[2]);
    expect(nz).toBeCloseTo(-1, 3);
    expect(Math.hypot(nx, ny)).toBeLessThan(0.01);
  });
});

describe("the clothes over her nipples", () => {
  it("tent out over a standing nipple, wider than the nipple, and lie flat a little way off", () => {
    const profile = nippleProfile(type("neat"), 0, 0, 1);
    expect(tentHeight(profile, 0)).toBeCloseTo(profile[0].h);
    expect(tentHeight(profile, profile[2].r * 1.5)).toBeGreaterThan(profile[0].h * 0.4);
    expect(tentHeight(profile, 0.03)).toBe(0);
  });

  it("lie flat over a tucked-in nipple, and rise over a puffy areola", () => {
    expect(tentHeight(nippleProfile(type("inverted"), 0, 0, 0), 0)).toBeLessThan(0.0011);
    const puffy = nippleProfile(type("puffy"), 0, 0, 0);
    expect(tentHeight(puffy, puffy[4].r)).toBeGreaterThanOrEqual(puffy[4].h);
  });
});
