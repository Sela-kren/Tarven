import { describe, expect, it } from "vitest";
import { Box3, Object3D, Vector3 } from "three";
import { poseBones } from "../src/game/battlepose";
import { DUEL_AREAS } from "../src/game/duel";
import { blendScene, HOLDING_SCENES, placeBody, SCENE_JOINS, SCENE_POSE_LIST, SCENE_POSES, sceneForEntry, sceneFraming, type Posed } from "../src/game/sexpose";
import { FOE_SCENE_LIST } from "../src/game/brawlscenes";

const them = (part: "kiss" | (typeof DUEL_AREAS)[number]["id"], stage = 0) => ({ side: "partner" as const, part, stage });
const hers = (move: Parameters<typeof sceneForEntry>[0]["move"]) => ({ side: "her" as const, move });

describe("the scene each moment of an after-hours game puts them in", () => {
  it("a man's moves, bolder the longer he keeps her", () => {
    expect(sceneForEntry(them("kiss"), false)).toBe("kiss");
    expect(sceneForEntry(them("mouth", 0), false)).toBe("kiss");
    expect(sceneForEntry(them("mouth", 1), false)).toBe("kneel");
    expect(sceneForEntry(them("mouth", 2), false)).toBe("throat");
    expect(sceneForEntry(them("breasts", 2), false)).toBe("paizuri");
    expect(sceneForEntry(them("butt", 1), false)).toBe("spank");
    expect(sceneForEntry(them("butt", 2), false)).toBe("doggy");
    expect(sceneForEntry(them("pussy", 1), false)).toBe("licked");
    expect(sceneForEntry(them("pussy", 2), false)).toBe("missionary");
  });

  it("every part of her, at every stage, has a scene", () => {
    for (const { id } of DUEL_AREAS) {
      for (const stage of [0, 1, 2, 5]) {
        expect(sceneForEntry(them(id, stage), false), `${id} ${stage}`).not.toBeNull();
        expect(sceneForEntry(them(id, stage), true), `${id} ${stage}`).not.toBeNull();
      }
    }
  });

  it("her own moves: riding him facing him, or his feet", () => {
    expect(sceneForEntry(hers("mouth"), false)).toBe("kneel");
    expect(sceneForEntry(hers("tits"), false)).toBe("paizuri");
    expect(sceneForEntry(hers("anal"), false)).toBe("doggy");
    expect(sceneForEntry(hers("undress"), false)).toBe("strip");
    expect(sceneForEntry(hers("ride"), false)).toBe("cowgirl");
    expect(sceneForEntry(hers("ride"), false, true)).toBe("reverse");
  });

  it("with a woman, none of a man's", () => {
    expect(sceneForEntry(them("pussy", 2), true)).toBe("grope");
    expect(sceneForEntry(hers("ride"), true, true)).toBe("cowgirl");
    expect(sceneForEntry(hers("hands"), true)).toBe("caress");
  });

  it("leaves them as they are for a note, a load, or what's no move at all", () => {
    expect(sceneForEntry({ side: "note" }, false)).toBeNull();
    expect(sceneForEntry({ side: "partner" }, false)).toBeNull();
    expect(sceneForEntry({ side: "her" }, false)).toBeNull();
  });
});

describe("the scenes themselves", () => {
  it("are all with a partner, and all made of real numbers", () => {
    const finite = (value: unknown): boolean =>
      typeof value === "number" ? Number.isFinite(value) : typeof value === "object" && value !== null ? Object.values(value).every(finite) : true;
    for (const name of SCENE_POSE_LIST) {
      expect(SCENE_POSES[name].them, name).not.toBeNull();
      expect(finite(SCENE_POSES[name]), name).toBe(true);
    }
  });

  it("blend from one to the next", () => {
    const { kiss, doggy } = SCENE_POSES;
    expect(blendScene(kiss, doggy, 0).her.place).toEqual(kiss.her.place);
    expect(blendScene(kiss, doggy, 1).them?.place).toEqual(doggy.them?.place);
    expect(blendScene(kiss, doggy, 0.5).her.place.x).toBeCloseTo((kiss.her.place.x + doggy.her.place.x) / 2);
  });
});

function body(): Posed {
  const model = new Object3D();
  const root = new Object3D();
  root.name = "Male";
  model.add(root);
  const hips = new Object3D();
  hips.name = "Male_Hips";
  hips.position.y = 0.95;
  root.add(hips);
  const head = new Object3D();
  head.name = "Male_Head";
  head.position.y = 0.7;
  hips.add(head);
  return { model, bones: poseBones(model, "Male"), female: false, hipsBaseY: 0.95, hipsBaseZ: 0, legLength: 0.9, scale: 2 };
}

describe("setting a body down on the stage", () => {
  it("puts it where the scene says, at the size it's drawn", () => {
    const posed = body();
    placeBody(posed, SCENE_POSES.kiss.them!.body, { x: 0.2, y: 0, z: -0.1, yaw: 0, pitch: 0, roll: 0 });
    expect(posed.model.position.toArray()).toEqual([0.4, 0, -0.2]);
  });

  it("laid on its back, its front turns up and its head goes where its back faced", () => {
    const posed = body();
    // Facing away from the camera (yaw 0), its back is to us: on its back, its head comes towards us.
    placeBody(posed, SCENE_POSES.cowgirl.them!.body, { x: 0, y: 0, z: 0, yaw: 0, pitch: Math.PI / 2, roll: 0 });
    posed.model.updateMatrixWorld(true);
    const head = posed.model.getObjectByName("Male_Head")!.getWorldPosition(new Vector3());
    expect(head.z).toBeGreaterThan(1);
    expect(Math.abs(head.y)).toBeLessThan(0.2);
  });
});

describe("framing a scene", () => {
  it("looks at the middle of the two of them from the scene's angle, further back the more there is", () => {
    const small = new Box3(new Vector3(-0.5, 0, -0.3), new Vector3(0.5, 1.7, 0.3));
    const big = new Box3(new Vector3(-1, 0, -0.6), new Vector3(1, 1.7, 0.6));
    const view = { yaw: 0, pitch: 0 };
    const near = sceneFraming(small, view, 28, 0.6);
    const far = sceneFraming(big, view, 28, 0.6);
    expect(near.target.toArray()).toEqual([0, 0.85, 0]);
    expect(near.position.x).toBeCloseTo(0);
    expect(near.position.z).toBeGreaterThan(0);
    expect(far.position.z).toBeGreaterThan(near.position.z);
    // Turned round and looking down.
    const side = sceneFraming(small, { yaw: Math.PI / 2, pitch: 0.3 }, 28, 0.6);
    expect(side.position.x).toBeGreaterThan(0);
    expect(side.position.y).toBeGreaterThan(0.85);
  });
});

describe("cropping in on a scene, as KP frames its poses", () => {
  it("looks at the scene's focus, scaled with the stage, and comes closer with its zoom", () => {
    const box = new Box3(new Vector3(-0.5, 0, -0.3), new Vector3(0.5, 1.7, 0.3));
    const whole = sceneFraming(box, { yaw: 0, pitch: 0 }, 28, 0.6);
    const crop = sceneFraming(box, { yaw: 0, pitch: 0, focus: [0.1, 0.5, 0], zoom: 0.5 }, 28, 0.6, 2);
    expect(crop.target.toArray()).toEqual([0.2, 1, 0]);
    expect(crop.position.z - crop.target.z).toBeCloseTo((whole.position.z - whole.target.z) * 0.5);
  });
});

describe("the brawl scenes' own poses (POSES_TODO.md)", () => {
  const own = FOE_SCENE_LIST.filter((def) =>
    ["footjob", "rimjob", "piledriver", "kickCounter", "standPaizuri", "soldierGangbang", "againstWall", "lapRide"].includes(def.id),
  );

  it("each scene shows its own pose, and holds", () => {
    expect(own.length).toBe(8);
    for (const def of own) {
      expect(def.pose, def.id).toBe(def.id);
      expect(HOLDING_SCENES.has(def.pose!), def.id).toBe(true);
    }
  });

  it("has a spot for every man its scene lets join her", () => {
    for (const def of own) {
      const slots = (SCENE_JOINS[def.pose!] ?? []).map((spot) => spot.slot);
      for (const slot of def.joins) expect(slots, `${def.id} ${slot}`).toContain(slot);
    }
  });

  it("stands on what it needs: the table, the post, the wall, the bench", () => {
    expect(SCENE_POSES.rimjob.table).toBeDefined();
    expect(SCENE_POSES.standPaizuri.props?.map((p) => p.kind)).toEqual(["post"]);
    expect(SCENE_POSES.againstWall.props?.map((p) => p.kind)).toEqual(["wall"]);
    expect(SCENE_POSES.lapRide.props?.map((p) => p.kind)).toEqual(["bench"]);
    expect(SCENE_POSES.kickCounter.props?.map((p) => p.kind)).toEqual(["bench"]);
  });
});
