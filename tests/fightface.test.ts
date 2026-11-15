import { describe, expect, it } from "vitest";
import { BATTLE_POSES, type BattlePoseName } from "../src/game/battlepose";
import { BEARING, EXPRESSIONS, FACE_KEYS, faceFor, FLUSH, type FaceCause } from "../src/game/face";
import {
  AROUSED_FROM,
  BAND_FROM,
  composeFace,
  fightBand,
  fightFace,
  fightFacePool,
  fightTier,
  PART_KEYS,
  WINNING_BY,
  type FightFaceCause,
} from "../src/game/fightface";

const POSES = Object.keys(BATTLE_POSES) as BattlePoseName[];
const base: FightFaceCause = { pose: "ready", stamina: 1, foeStamina: 1, slut: 0, arousal: 0 };
const LEWD = BEARING.confident;
const EASY = BEARING.easy;

/** Every expression a moment's pool can put on each part of her face. */
function partsOf(cause: FightFaceCause) {
  const pool = fightFacePool(cause);
  return {
    brows: new Set(pool.flatMap((e) => e.preset.brows)),
    eyes: new Set(pool.flatMap((e) => e.preset.eyes)),
    mouth: new Set(pool.flatMap((e) => e.preset.mouth)),
  };
}

describe("her face, put together from parts", () => {
  it("between them, the parts and her blush cover every point of her face, each once", () => {
    const keys = [...PART_KEYS.brows, ...PART_KEYS.eyes, ...PART_KEYS.mouth, "blush"];
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...FACE_KEYS].sort());
  });

  it("takes each part from its own expression, and the deepest blush", () => {
    const shape = composeFace({ brows: "angry", eyes: "surprised", mouth: "strained" });
    expect(shape.browInner).toBe(EXPRESSIONS.angry.browInner);
    expect(shape.crease).toBe(EXPRESSIONS.angry.crease);
    expect(shape.wide).toBe(EXPRESSIONS.surprised.wide);
    expect(shape.bare).toBe(EXPRESSIONS.strained.bare);
    expect(shape.blush).toBe(Math.max(EXPRESSIONS.angry.blush, EXPRESSIONS.surprised.blush, EXPRESSIONS.strained.blush));
  });
});

describe("KP's tiers and bands", () => {
  it("her tier from her Slut Level", () => {
    expect(fightTier(0)).toBe("proper");
    expect(fightTier(EASY)).toBe("easy");
    expect(fightTier(LEWD)).toBe("lewd");
  });

  it("her stamina in KP's bands: 100-61, 60-21, 20-0", () => {
    expect(fightBand(1)).toBe("fresh");
    expect(fightBand(BAND_FROM.fresh)).toBe("fresh");
    expect(fightBand(0.6)).toBe("worn");
    expect(fightBand(BAND_FROM.worn)).toBe("worn");
    expect(fightBand(0.2)).toBe("spent");
  });
});

describe("the pool of faces for each moment", () => {
  it("always has a face in it, whatever the moment and however she stands", () => {
    for (const pose of POSES) {
      for (const slut of [0, EASY, LEWD]) {
        for (const stamina of [1, 0.4, 0.1]) {
          for (const arousal of [0, 1]) {
            for (const foeStamina of [1, 0]) {
              const pool = fightFacePool({ pose, slut, stamina, arousal, foeStamina });
              expect(pool.length, pose).toBeGreaterThan(0);
              for (const { preset, weight } of pool) {
                expect(weight).toBeGreaterThan(0);
                for (const options of [preset.brows, preset.eyes, preset.mouth]) {
                  expect(options.length).toBeGreaterThan(0);
                  for (const e of options) expect(EXPRESSIONS[e], e).toBeDefined();
                }
              }
            }
          }
        }
      }
    }
  });

  it("their hands on her: disgust while she's proper, embarrassment at ease, wanting it once she's lewd", () => {
    expect(partsOf({ ...base, pose: "held" }).mouth).toEqual(new Set(["annoyed", "strained"]));
    expect(partsOf({ ...base, pose: "held", slut: EASY }).brows.has("embarrassed")).toBe(true);
    expect(partsOf({ ...base, pose: "held", slut: LEWD }).mouth.has("aroused")).toBe(true);
    // Worked up, she's a tier on.
    expect(partsOf({ ...base, pose: "held", arousal: AROUSED_FROM }).brows.has("embarrassed")).toBe(true);
  });

  it("her swing grits her teeth, and spent she strains", () => {
    expect(partsOf({ ...base, pose: "strike" }).mouth.has("strained")).toBe(true);
    expect(partsOf({ ...base, pose: "strike", stamina: 0.1 }).brows).toEqual(new Set(["strained"]));
  });

  it("winning, a lewd woman grins as she swings; a proper one doesn't", () => {
    const ahead = { ...base, pose: "strike" as const, foeStamina: 1 - WINNING_BY * 2 };
    expect(partsOf({ ...ahead, slut: LEWD }).mouth.has("delighted")).toBe(true);
    expect(partsOf(ahead).mouth.has("delighted")).toBe(false);
  });

  it("a dodge is a smirk fresh, a near thing worn", () => {
    expect(partsOf({ ...base, pose: "dodge", slut: EASY }).mouth.has("confident")).toBe(true);
    expect(partsOf({ ...base, pose: "dodge", stamina: 0.4 }).eyes.has("surprised")).toBe(true);
  });

  it("a blow landing on a lewd woman who's worked up can show KP's masochist face", () => {
    expect(partsOf({ ...base, pose: "guard" }).eyes.has("pleasure")).toBe(false);
    expect(partsOf({ ...base, pose: "guard", slut: LEWD, arousal: 1 }).eyes.has("pleasure")).toBe(true);
  });

  it("down, a lewd woman worked up is lost to it", () => {
    expect(partsOf({ ...base, pose: "down", slut: LEWD, arousal: 1 }).mouth.has("lost")).toBe(true);
    expect(partsOf({ ...base, pose: "down" }).mouth.has("lost")).toBe(false);
  });
});

describe("picking a face", () => {
  it("by weight, then each part from its own pool", () => {
    // Lewd and winning, squared up: her stance face (weight 3) then the confident one (weight 3).
    const cause = { ...base, slut: LEWD, foeStamina: 0 };
    expect(fightFace(cause, () => 0).parts).toEqual({ brows: "confident", eyes: "confident", mouth: "confident" });
    expect(fightFace(cause, () => 0.999).parts).toEqual({ brows: "confident", eyes: "confident", mouth: "smile" });
    const mid = [0.2, 0.99, 0.99, 0.99];
    expect(fightFace(cause, () => mid.shift() ?? 0).parts).toEqual({ brows: "confident", eyes: "sultry", mouth: "smile" });
  });

  it("doesn't wear quite the same face every time", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(JSON.stringify(fightFace({ ...base, pose: "guard" }, random).parts));
    expect(seen.size).toBeGreaterThan(2);
  });
});

describe("her face in a brawl", () => {
  const fighting: FaceCause = { showing: null, reaction: null, arousal: 0, drunk: 0, fighting: true };

  it("is the moment's face, with her flush and heavy lids over it as ever", () => {
    const face = composeFace({ brows: "strained", eyes: "strained", mouth: "strained" });
    expect(faceFor({ ...fighting, fightFace: face })).toEqual(face);
    const calm = composeFace({ brows: "angry", eyes: "angry", mouth: "angry" });
    expect(faceFor({ ...fighting, fightFace: calm, arousal: 1 }).blush).toBe(FLUSH.arousal);
  });

  it("gives way to a touch or a moment, and is just anger before one's been picked", () => {
    const face = composeFace({ brows: "confident", eyes: "confident", mouth: "smile" });
    expect(faceFor({ ...fighting, fightFace: face, reaction: "jolt" })).toEqual(faceFor({ ...fighting, reaction: "jolt" }));
    expect(faceFor({ ...fighting, fightFace: face, moment: "refused" }).smile).toBe(EXPRESSIONS.angry.smile);
    expect(faceFor(fighting)).toEqual(EXPRESSIONS.angry);
  });
});
