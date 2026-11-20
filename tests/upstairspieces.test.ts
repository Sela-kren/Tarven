import { Box3, Mesh, MeshStandardMaterial, Object3D } from "three";
import { describe, expect, it } from "vitest";
import { setDoorLampLit, stairsHeightAt, STAIRS_RISE, STAIRS_RUN, UPSTAIRS_PIECES } from "../src/game/upstairspieces";

const m = (name: string) => new MeshStandardMaterial({ name });

const NAMES: Record<string, string> = {
  stairsUp: "Stairs_Up",
  stairWell: "Stair_Well",
  bedPlain: "Bed_Plain",
  bedLantern: "Bed_Lantern",
  washstand: "Washstand",
  nightstand: "Nightstand",
  chest: "Chest",
  crates: "Crates",
  doorPlain: "Door_Plain",
  doorFrame: "Door_Frame",
  doorLamp: "Door_Lamp",
};
const COLLIDE = new Set(["bedPlain", "bedLantern", "washstand", "nightstand", "chest", "crates"]);
/** Pieces that don't stand on the floor: the well goes down into it, the lamp hangs on a wall. */
const OFF_FLOOR = new Set(["stairWell", "doorLamp"]);

function triangles(root: Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { index, attributes } = object.geometry;
    count += (index ? index.count : attributes.position.count) / 3;
  });
  return count;
}

describe("upstairs pieces", () => {
  it("has exactly the wished-for pieces", () => {
    expect(Object.keys(UPSTAIRS_PIECES).sort()).toEqual(Object.keys(NAMES).sort());
  });

  for (const [id, entry] of Object.entries(UPSTAIRS_PIECES)) {
    it(`${id} builds as ${NAMES[id]}, the size the table says`, () => {
      const piece = entry.build(m);
      expect(piece.name).toBe(NAMES[id]);
      expect(Boolean(piece.userData.collide)).toBe(COLLIDE.has(id));

      const bounds = new Box3().setFromObject(piece);
      const size = bounds.getSize(bounds.min.clone());
      const r = (v: number) => Math.round(v * 100) / 100;
      console.log(
        `${id}: footprint { w: ${r(size.x)}, d: ${r(size.z)}, h: ${r(size.y)} }, min [${r(bounds.min.x)}, ${r(bounds.min.y)}, ${r(bounds.min.z)}], ${triangles(piece)} triangles`,
      );

      const { footprint, min } = entry;
      expect(size.x).toBeLessThanOrEqual(footprint.w + 0.006);
      expect(size.z).toBeLessThanOrEqual(footprint.d + 0.006);
      expect(size.y).toBeLessThanOrEqual(footprint.h + 0.006);
      expect(bounds.min.x).toBeCloseTo(min[0], 1);
      expect(bounds.min.y).toBeCloseTo(min[1], 1);
      expect(bounds.min.z).toBeCloseTo(min[2], 1);
      if (!OFF_FLOOR.has(id)) expect(bounds.min.y).toBeCloseTo(0, 1);
      if (id !== "doorPlain" && id !== "doorLamp") {
        // Centred on x and z.
        expect(bounds.min.x + bounds.max.x).toBeCloseTo(0, 1);
        expect(bounds.min.z + bounds.max.z).toBeCloseTo(0, 1);
      }
    });
  }

  it("the stair well's floor is level with y = 0", () => {
    const well = UPSTAIRS_PIECES.stairWell.build(m);
    const floor = well.children.filter((child) => child instanceof Mesh && (child.material as MeshStandardMaterial).name === "T_floor");
    for (const board of floor) expect(new Box3().setFromObject(board).max.y).toBeCloseTo(0, 3);
  });

  it("the plain door hangs from its hinge at the origin and runs 0.9 m east", () => {
    const bounds = new Box3().setFromObject(UPSTAIRS_PIECES.doorPlain.build(m));
    expect(bounds.min.x).toBeCloseTo(0, 1);
    expect(bounds.max.x).toBeCloseTo(0.9, 1);
    expect(bounds.max.y).toBeLessThanOrEqual(2.1);
  });

  it("the Lantern bed's canopy stays under 1.9 m", () => {
    expect(new Box3().setFromObject(UPSTAIRS_PIECES.bedLantern.build(m)).max.y).toBeLessThan(1.9);
  });

  it("the nightstand carries a candle with a light anchor", () => {
    const stand = UPSTAIRS_PIECES.nightstand.build(m);
    expect(stand.getObjectByName("Light_Candle_Nightstand")?.userData.light).toBe("candle");
  });

  it("the door lamp hangs about 2 m up with a lantern light anchor, and lights and goes out", () => {
    const lamp = UPSTAIRS_PIECES.doorLamp.build(m);
    const anchor = lamp.getObjectByName("Light_Door_Lamp");
    expect(anchor?.userData.light).toBe("lantern");
    expect(anchor!.position.y).toBeGreaterThan(1.8);
    expect(anchor!.position.y).toBeLessThan(2.1);

    const shown = (lit: boolean) => {
      const out: Object3D[] = [];
      lamp.traverse((o) => o.userData.lampLit === lit && o.visible && out.push(o));
      return out.length;
    };
    const hidden = (lit: boolean) => {
      let count = 0;
      lamp.traverse((o) => o.userData.lampLit === lit && !o.visible && count++);
      return count;
    };
    // Starts out: the dark glass shows, the glow and flame don't.
    expect(shown(false)).toBeGreaterThan(0);
    expect(shown(true)).toBe(0);
    setDoorLampLit(lamp, true);
    expect(lamp.userData.lit).toBe(true);
    expect(shown(true)).toBe(2);
    expect(hidden(false)).toBeGreaterThan(0);
    expect(shown(false)).toBe(0);
    setDoorLampLit(lamp, false);
    expect(shown(true)).toBe(0);
    expect(shown(false)).toBeGreaterThan(0);
  });

  it("stairsHeightAt climbs from 0 at the foot to the full rise at the top, a tread at a time", () => {
    const foot = STAIRS_RUN / 2;
    expect(stairsHeightAt(foot + 1)).toBe(0);
    expect(stairsHeightAt(foot)).toBe(0);
    expect(stairsHeightAt(-foot)).toBeCloseTo(STAIRS_RISE);
    expect(stairsHeightAt(-foot - 1)).toBeCloseTo(STAIRS_RISE);
    expect(stairsHeightAt(0)).toBeCloseTo(STAIRS_RISE / 2);
    let last = -1;
    for (let z = foot; z >= -foot; z -= 0.05) {
      const height = stairsHeightAt(z);
      expect(height).toBeGreaterThanOrEqual(last);
      last = height;
    }
  });

  it("the stair treads stand at stairsHeightAt", () => {
    const stairs = UPSTAIRS_PIECES.stairsUp.build(m);
    // The tread at the middle of the run is the 8th, standing at half the rise.
    const at = new Box3();
    let found = false;
    for (const child of stairs.children) {
      at.setFromObject(child);
      if (at.max.y - at.min.y < 0.05 && at.min.z <= 0.01 && at.max.z >= 0.24 && at.min.z > -0.01) {
        expect(at.max.y).toBeCloseTo(stairsHeightAt(0.1), 3);
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});
