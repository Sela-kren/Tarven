import { describe, expect, it } from "vitest";
import {
  PENIS_SPOKES,
  PENIS_TIP,
  PENIS_TYPES,
  SCROTUM_LAST,
  glansRadius,
  penisAngle,
  penisRings,
  penisShape,
  readPenis,
  sackProfile,
  shapePenis,
} from "../src/game/penis";

const type = (id: string) => PENIS_TYPES.find((t) => t.id === id)!;
const shape = (id: string, arousal = 0, sliders: Partial<Record<"length" | "girth" | "head" | "skin" | "balls" | "hang", number>> = {}) =>
  penisShape(type(id), sliders.length ?? 0, sliders.girth ?? 0, sliders.head ?? 0, sliders.skin ?? 0, sliders.balls ?? 0, sliders.hang ?? 0, arousal);

/** The lip is the ring after the shaft and outer foreskin. */
const LIP = 8 + 3;

/**
 * A tube and sack as the model builds them: the tube standing straight out of him (-z in the model's space) from a
 * root at the groin, the sack's mouth below it, split into meshes as the materials split them. UVs carry ring and
 * spoke, v upside down as glTF stores it.
 */
function builtPatch() {
  const root = [0, 1.005, -0.065];
  const meshes: { uv: number[]; pos: number[] }[] = [{ uv: [], pos: [] }, { uv: [], pos: [] }, { uv: [], pos: [] }];
  for (let ring = 0; ring <= PENIS_TIP; ring++) {
    const spokes = ring === PENIS_TIP ? 1 : PENIS_SPOKES;
    for (let k = 0; k < spokes; k++) {
      const a = (2 * Math.PI * k) / PENIS_SPOKES;
      const r = ring === PENIS_TIP ? 0 : 0.016;
      const mesh = ring <= LIP ? 0 : 1;
      meshes[mesh].uv.push(ring / PENIS_TIP, 1 - k / PENIS_SPOKES);
      meshes[mesh].pos.push(root[0] + Math.cos(a) * r, root[1] + Math.sin(a) * r, root[2] - (0.14 * ring) / PENIS_TIP);
    }
  }
  for (let ring = 0; ring <= SCROTUM_LAST; ring++) {
    const spokes = ring === SCROTUM_LAST ? 1 : PENIS_SPOKES;
    for (let k = 0; k < spokes; k++) {
      const a = (2 * Math.PI * k) / PENIS_SPOKES;
      meshes[2].uv.push(ring / SCROTUM_LAST, 1 - k / PENIS_SPOKES);
      meshes[2].pos.push(Math.cos(a) * 0.017, 0.982 + Math.sin(a) * 0.009 - ring * 0.008, -0.043 - ring * 0.002);
    }
  }
  const uvs = meshes.map(({ uv }) => ({ count: uv.length / 2, getX: (i: number) => uv[i * 2], getY: (i: number) => uv[i * 2 + 1] }));
  return { uvs, on: meshes.map(({ pos }) => Float32Array.from(pos)) };
}

function shaped(id: string, arousal: number, packed = 0) {
  const { uvs, on } = builtPatch();
  const patch = readPenis(uvs.slice(0, 2), uvs.slice(2))!;
  const out = on.map((p) => new Float32Array(p.length));
  shapePenis(patch, on, penisShape(type(id), 0, 0, 0, 0, 0, 0, arousal, packed), out);
  // The tip is the last corner of the glans' mesh; the sack's bottom the last of its.
  const glans = out[1];
  const sack = out[2];
  return {
    tip: Array.from(glans.subarray(glans.length - 3)),
    bottom: Array.from(sack.subarray(sack.length - 3)),
    out,
  };
}

describe("penis types", () => {
  it("has uncircumcised first, then circumcised, virgin and the rest", () => {
    expect(PENIS_TYPES.map((t) => t.id)).toEqual([
      "uncut", "cut", "virgin", "hooded", "grower", "shower", "thick", "mushroom", "tapered", "curved", "downward", "small", "large",
    ]);
    expect(new Set(PENIS_TYPES.map((t) => t.label)).size).toBe(PENIS_TYPES.length);
  });

  it("grows longer and thicker and stands up as he hardens", () => {
    for (const t of PENIS_TYPES) {
      const soft = shape(t.id, 0);
      const hard = shape(t.id, 1);
      expect(hard.length).toBeGreaterThan(soft.length * 1.05);
      expect(hard.radius).toBeGreaterThan(soft.radius * 1.15);
      expect(penisAngle(soft, soft.length)).toBeLessThan(-1);
      expect(penisAngle(hard, hard.length)).toBeGreaterThan(0);
    }
  });

  it("grows a grower far more than a shower", () => {
    const growth = (id: string) => shape(id, 1).length / shape(id, 0).length;
    expect(growth("grower")).toBeGreaterThan(2);
    expect(growth("shower")).toBeLessThan(1.3);
    expect(shape("shower", 0).length).toBeGreaterThan(shape("grower", 0).length);
  });

  it("keeps the virgin's snug foreskin over the glans even hard", () => {
    expect(shape("virgin", 1).cover).toBeGreaterThan(0.8);
    const hard = shape("virgin", 1);
    expect(penisRings(hard)[LIP].s).toBeGreaterThan(hard.length - hard.glans * 0.2);
    expect(shape("virgin", 1).length).toBeLessThan(shape("uncut", 1).length);
  });

  it("curves the downward type down and the curved one up", () => {
    const end = (id: string) => penisAngle(shape(id, 1), shape(id, 1).length) - penisAngle(shape(id, 1), 0);
    expect(end("downward")).toBeLessThan(-0.2);
    expect(end("curved")).toBeGreaterThan(0.3);
  });

  it("covers the glans while soft and draws the foreskin back as he hardens, unless cut", () => {
    expect(shape("uncut", 0).cover).toBe(1);
    expect(shape("uncut", 1).cover).toBeLessThan(0.2);
    expect(shape("cut", 0).cover).toBe(0);
    expect(shape("cut", 0, { skin: 1 }).cover).toBe(0);
    expect(shape("curved", 0, { skin: -1 }).cover).toBeLessThan(shape("curved", 0).cover);
  });

  it("sizes with its sliders", () => {
    expect(shape("uncut", 0, { length: 1 }).length).toBeGreaterThan(shape("uncut", 0).length);
    expect(shape("uncut", 0, { length: -1 }).length).toBeLessThan(shape("uncut", 0).length);
    expect(shape("uncut", 0, { girth: 1 }).radius).toBeGreaterThan(shape("uncut", 0).radius);
    expect(shape("uncut", 0, { head: 1 }).glans).toBeGreaterThan(shape("uncut", 0).glans);
    expect(shape("uncut", 0, { balls: 1 }).sack.width).toBeGreaterThan(shape("uncut", 0).sack.width);
    expect(shape("uncut", 0, { hang: 1 }).sack.hang).toBeGreaterThan(shape("uncut", 0).sack.hang);
  });

  it("draws the sack up tight as he hardens", () => {
    expect(shape("uncut", 1).sack.hang).toBeLessThan(shape("uncut", 0).sack.hang * 0.5);
  });

  it("gives the mushroom head the broadest crown and the curved one the most curve", () => {
    const crown = (id: string) => {
      const s = shape(id, 1);
      return glansRadius(s, s.length - s.glans * 0.88);
    };
    const flare = (id: string) => crown(id) / shape(id, 1).radius;
    for (const t of PENIS_TYPES) if (t.id !== "mushroom") expect(flare("mushroom")).toBeGreaterThan(flare(t.id));
    for (const t of PENIS_TYPES) if (t.id !== "curved") expect(type("curved").curve).toBeGreaterThan(t.curve);
  });
});

describe("penis rings", () => {
  it("puts the foreskin's lip past the tip while covered, and behind the glans drawn back", () => {
    const soft = shape("uncut", 0);
    expect(penisRings(soft)[LIP].s).toBeGreaterThan(soft.length);
    const hard = shape("uncut", 1);
    expect(penisRings(hard)[LIP].s).toBeLessThan(hard.length - hard.glans * 0.5);
    const cut = shape("cut", 0);
    expect(penisRings(cut)[LIP].s).toBeLessThan(cut.length - cut.glans);
  });

  it("never lets the foreskin pass inside the glans", () => {
    for (const t of PENIS_TYPES) {
      for (const a of [0, 0.3, 0.5, 0.7, 1]) {
        const s = shape(t.id, a);
        const rings = penisRings(s);
        for (let i = 8; i <= LIP; i++) expect(rings[i].r).toBeGreaterThanOrEqual(glansRadius(s, rings[i].s));
      }
    }
  });

  it("ends in a point at the tip, with one ring per part", () => {
    const rings = penisRings(shape("uncut", 0.5));
    expect(rings).toHaveLength(PENIS_TIP + 1);
    expect(rings[PENIS_TIP].r).toBe(0);
  });

  it("rounds the sack off to nothing at its bottom", () => {
    expect(sackProfile(0.5)).toBe(1);
    expect(sackProfile(1)).toBe(0);
    expect(sackProfile(0)).toBeGreaterThan(0.3);
  });
});

describe("shaping the model", () => {
  it("finds the tube and the sack in their meshes", () => {
    const { uvs } = builtPatch();
    expect(readPenis(uvs.slice(0, 2), uvs.slice(2))).not.toBeNull();
    expect(readPenis(uvs.slice(0, 1), uvs.slice(2))).toBeNull();
  });

  it("hangs the tip below the root while soft and stands it above and out while hard", () => {
    const soft = shaped("uncut", 0);
    const hard = shaped("uncut", 1);
    expect(soft.tip[1]).toBeLessThan(1.005 - 0.04);
    expect(hard.tip[1]).toBeGreaterThan(1.005 + 0.03);
    // Out of him is -z.
    expect(hard.tip[2]).toBeLessThan(-0.065 - 0.1);
  });

  it("hangs the soft penis in front of the sack, not inside it", () => {
    const { tip, out } = shaped("uncut", 0);
    // The sack's furthest point out of him.
    let front = Infinity;
    for (let i = 2; i < out[2].length; i += 3) front = Math.min(front, out[2][i]);
    expect(tip[2]).toBeLessThan(front);
  });

  it("presses it in against him, held in his clothes, still tenting them out while hard", () => {
    // Out of him is -z, from a root at z -0.065: how far each tip stands out.
    const out = (tip: number[]) => -0.065 - tip[2];
    expect(out(shaped("uncut", 0, 1).tip)).toBeLessThan(out(shaped("uncut", 0).tip) * 0.7);
    const hard = shaped("uncut", 1, 1).tip;
    expect(out(hard)).toBeLessThan(out(shaped("uncut", 1).tip));
    expect(out(hard)).toBeGreaterThan(0.05);
    expect(hard[1]).toBeGreaterThan(1.005);
    // The sack is held up too.
    expect(shaped("uncut", 0, 1).bottom[1]).toBeGreaterThan(shaped("uncut", 0).bottom[1]);
  });

  it("draws the sack's bottom up as he hardens", () => {
    expect(shaped("uncut", 1).bottom[1]).toBeGreaterThan(shaped("uncut", 0).bottom[1] + 0.01);
  });

  it("leaves the sack's mouth where it lies on his skin", () => {
    const { on } = builtPatch();
    const { out } = shaped("uncut", 0.5);
    for (let i = 0; i < PENIS_SPOKES * 3; i++) expect(out[2][i]).toBeCloseTo(on[2][i], 6);
  });
});
