import { describe, expect, it } from "vitest";
import { brawlBeats, intimateOf, intimateScene, takenOf, takenScene, touchScene } from "../src/game/brawlscene";
import { HOLDING_SCENES } from "../src/game/sexpose";

const shot = () => true;
const scene = (move: "hands" | "mouth" | "ride") => intimateScene(move, "farmer", false, 1);
const sceneOf = (event: string) => {
  const move = intimateOf(event);
  if (move) return scene(move);
  const area = takenOf(event);
  return area ? takenScene(area, "farmer", false) : null;
};

describe("sex mid-brawl, Karryn's Prison style", () => {
  it("her hands, her mouth and riding them each put her in a scene with them", () => {
    expect(intimateOf("intimate:ride")).toBe("ride");
    expect(intimateOf("strike:hit")).toBeNull();
    expect(scene("hands")).toBe("stroke");
    expect(scene("mouth")).toBe("kneel");
    expect(scene("ride")).toBe("cowgirl");
  });

  it("her mouth again goes deeper and stays there; riding them again she stays as she is (KP holds the pose)", () => {
    expect(intimateScene("mouth", "farmer", false, 2)).toBe("throat");
    expect(intimateScene("mouth", "farmer", false, 3)).toBe("throat");
    expect(intimateScene("ride", "farmer", false, 2)).toBe("cowgirl");
    expect(intimateScene("ride", "farmer", false, 3)).toBe("cowgirl");
  });

  it("her willpower doesn't move her out of it, and going down doesn't either", () => {
    expect(brawlBeats(["suppress", "their:miss"], shot, 1, "ready", "cowgirl", sceneOf).held).toBe("cowgirl");
    const down = brawlBeats(["intimate:hands"], shot, 1, "down", null, sceneOf);
    expect(down.held).toBe("stroke");
    expect(down.beats.at(-1)).toMatchObject({ pose: "down", scene: "stroke" });
  });

  it("he keeps going if he came in her with more in him; done with her, it ends", () => {
    // Her own scene: "their:again" (still in her) holds it; coming and catching his breath ends it.
    expect(brawlBeats(["their:come", "their:again"], shot, 1, "ready", "cowgirl", sceneOf).held).toBe("cowgirl");
    expect(brawlBeats(["their:come", "their:recover"], shot, 1, "ready", "cowgirl", sceneOf).held).toBeNull();
    // A foe's scene: held while he still has her, whoever came; over once he's let go.
    expect(brawlBeats(["their:come"], shot, 1, "ready", "missionary", sceneOf, true, true)).toMatchObject({ held: "missionary", taken: true });
    expect(brawlBeats(["their:come"], shot, 1, "ready", "missionary", sceneOf, true, false)).toMatchObject({ held: null, taken: false });
  });

  it("the scene holds through their turn, a blow still landing on her", () => {
    const { beats, held } = brawlBeats(["intimate:ride", "their:hit"], shot, 1, "ready", null, sceneOf);
    expect(held).toBe("cowgirl");
    expect(beats.map((b) => b.scene)).toEqual(["cowgirl", "cowgirl", "cowgirl"]);
    expect(beats[1].hurt).toBe(true);
    // And into the next turn, while she keeps at it.
    const next = brawlBeats(["their:miss"], shot, 1, "ready", held, sceneOf);
    expect(next.held).toBe("cowgirl");
    expect(next.beats.every((b) => b.scene === "cowgirl")).toBe(true);
  });

  it("anything else she does takes her out of it and back into the fight", () => {
    const { beats, held } = brawlBeats(["strike:hit", "their:miss"], shot, 1, "ready", "cowgirl", sceneOf);
    expect(held).toBeNull();
    expect(beats.every((b) => b.scene === undefined)).toBe(true);
    expect(beats[0].pose).toBe("strike");
  });

  it("done, there's no scene left", () => {
    const lost = brawlBeats(["intimate:hands", "lost"], shot, 1, "down", null, sceneOf);
    expect(lost.held).toBeNull();
    expect(lost.beats.at(-1)).toMatchObject({ pose: "down" });
    expect(lost.beats.at(-1)?.scene).toBeUndefined();
  });

  it("a touch she lets land shows for a moment: a kiss, a grope, a spank", () => {
    expect(touchScene({ id: "x", region: "lips" })).toBe("kiss");
    expect(touchScene({ id: "x", region: "chest" })).toBe("grope");
    expect(touchScene({ id: "scuffleSpank", region: "rear" })).toBe("spank");
    expect(touchScene({ id: "x", region: "rear" })).toBe("grab");
    expect(touchScene({ id: "x", region: "clothes" })).toBeNull();
    for (const region of ["lips", "chest", "rear", "thigh", "waist"] as const) {
      expect(HOLDING_SCENES.has(touchScene({ id: "x", region })!)).toBe(false);
    }
  });

  it("a scene a foe starts holds till she struggles free: steeling herself doesn't free her", () => {
    expect(takenScene("pussy", "farmer", false)).toBe("missionary");
    expect(takenScene("mouth", "farmer", false)).toBe("kneel");
    const first = brawlBeats(["their:offer:pussy", "taken:pussy"], shot, 1, "ready", null, sceneOf);
    expect(first).toMatchObject({ held: "missionary", taken: true });
    const steeled = brawlBeats(["steel", "their:pose:pussy"], shot, 1, "ready", first.held, sceneOf, first.taken);
    expect(steeled.held).toBe("missionary");
    const free = brawlBeats(["struggle:free", "staggered"], shot, 1, "ready", steeled.held, sceneOf, steeled.taken);
    expect(free).toMatchObject({ held: null, taken: false });
  });
});
