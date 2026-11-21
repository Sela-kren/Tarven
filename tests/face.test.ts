import { describe, expect, it } from "vitest";
import {
  blendFace,
  easeFace,
  EXPRESSIONS,
  expressionFor,
  eyesShut,
  FACE_KEY_NAMES,
  FACE_NUMBERS,
  FACE_PARTS,
  faceFor,
  faceKeyWeights,
  faceMoved,
  HEAVY_LIDS,
  mouthPress,
  REST_FACE,
  shutAtLeast,
  SULTRY_PAST,
  BASHFUL_BELOW,
  DELIGHTED_PAST,
  BEARING,
  EXPRESSIONS_LIST,
  FACE_EXTRAS,
  EXTRAS,
  VARIANTS,
  withVariant,
  type Expression,
  type FaceCause,
  type FaceShape,
} from "../src/game/face";

const calm: FaceCause = { showing: null, reaction: null, arousal: 0, drunk: 0 };

describe("her face", () => {
  it("picks her expression from what she's going through", () => {
    // Her bearing, from her Slut Level: stern, at ease, confident.
    expect(expressionFor(calm)).toBe("stern");
    expect(expressionFor({ ...calm, slut: BEARING.easy })).toBe("neutral");
    expect(expressionFor({ ...calm, slut: BEARING.confident })).toBe("confident");
    // Showing a guest something: shy, until she wants it well past what it takes.
    // Showing a guest something: bashful barely able to, shy, sultry, then delighted the more she wants it.
    expect(expressionFor({ ...calm, showing: 0 })).toBe("bashful");
    expect(expressionFor({ ...calm, showing: BASHFUL_BELOW })).toBe("shy");
    expect(expressionFor({ ...calm, showing: DELIGHTED_PAST })).toBe("delighted");
    expect(expressionFor({ ...calm, showing: SULTRY_PAST })).toBe("sultry");
    // A touch's reaction comes first.
    expect(expressionFor({ ...calm, showing: 5, reaction: "jolt" })).toBe("surprised");
    expect(expressionFor({ ...calm, reaction: "melt" })).toBe("pleasure");
    expect(expressionFor({ ...calm, reaction: "recoil" })).toBe("annoyed");
    // What she's in the middle of: an after-hours game, a brawl.
    // In an after-hours game: still proper she strains against it, worked up between, lewd enough she loves it.
    expect(expressionFor({ ...calm, duel: { state: "aroused", pleasure: 0.3 } })).toBe("strained");
    expect(expressionFor({ ...calm, slut: BEARING.easy, duel: { state: "aroused", pleasure: 0.3 } })).toBe("aroused");
    expect(expressionFor({ ...calm, slut: BEARING.confident, duel: { state: "aroused", pleasure: 0.3 } })).toBe("delighted");
    // Melting into a touch: pleasure while she's proper, blissful once she's lewd.
    expect(expressionFor({ ...calm, slut: BEARING.confident, reaction: "melt" })).toBe("blissful");
    expect(expressionFor({ ...calm, duel: { state: "edge", pleasure: 0.9 } })).toBe("edge");
    expect(expressionFor({ ...calm, duel: { state: "calm", pleasure: 0 } })).toBe("stern");
    expect(expressionFor({ ...calm, fighting: true })).toBe("angry");
    // What just happened, for a moment; a touch still comes first.
    expect(expressionFor({ ...calm, moment: "tipped" })).toBe("smile");
    expect(expressionFor({ ...calm, moment: "walkedOut" })).toBe("annoyed");
    expect(expressionFor({ ...calm, moment: "refused", showing: 0 })).toBe("angry");
    expect(expressionFor({ ...calm, moment: "tipped", reaction: "jolt" })).toBe("surprised");
    // Jolted while she's worked up, she's overwhelmed; on the edge with her pleasure past it, she loses herself.
    expect(expressionFor({ ...calm, reaction: "jolt", arousal: 0.8 })).toBe("overwhelmed");
    const edge = (pleasure: number) => faceFor({ ...calm, duel: { state: "edge", pleasure } });
    expect(edge(1).mouth.lost).toBeGreaterThan(0.9);
    expect(edge(0.5).mouth).toEqual({ edge: 1 });
  });

  it("wears her state over her bearing: tired, embarrassed, drunk", () => {
    const at = (cause: Partial<FaceCause>) => faceFor({ ...calm, slut: BEARING.easy, ...cause });
    const rest = at({});
    // Worn down, she wears spent's brows, eyes and mouth: her lids heavy, her brows sagging up in the middle.
    expect(eyesShut(at({ will: 0 }))).toBeGreaterThan(eyesShut(rest) + 0.3);
    expect(at({ will: 0 }).brows.spent).toBeCloseTo(1, 6);
    expect(at({ will: 0.8 })).toEqual(rest);
    // Her clothes off, she's red and looks away; less so the lewder she is, not at all once she's shameless.
    expect(at({ exposed: 1 }).blush).toBeGreaterThan(0.6);
    expect(at({ exposed: 1 }).lookX).toBeLessThan(0);
    expect(at({ exposed: 1, slut: BEARING.shameless }).blush).toBe(faceFor({ ...calm, slut: BEARING.shameless }).blush);
    // Drunk, her mouth goes to drunk's loose smile.
    expect(at({ drunk: 1 }).mouth.drunk).toBeCloseTo(0.8, 6);
    // Worked up in an after-hours game, she pants as her pleasure climbs, tongue and all.
    const game = (pleasure: number) => faceFor({ ...calm, slut: BEARING.easy, duel: { state: "aroused", pleasure } });
    expect(eyesShut(game(1))).toBeGreaterThan(eyesShut(game(0)));
    expect(game(1).mouth.panting).toBeGreaterThan(0.5);
  });

  it("wears down in KP's steps as her willpower runs out: mouth set, teeth gritted, then spent", () => {
    const at = (will: number, slut = 0) => faceFor({ ...calm, slut, will });
    // (Her sweat comes on as she wears down too: see "brings on KP's extras".)
    const same = (a: FaceShape, b: FaceShape) => {
      for (const key of FACE_NUMBERS) if (key !== "sweat") expect(a[key]).toBeCloseTo(b[key], 6);
      for (const part of FACE_PARTS) {
        for (const e of new Set([...Object.keys(a[part]), ...Object.keys(b[part])]) as Set<Expression>) {
          expect(a[part][e] ?? 0).toBeCloseTo(b[part][e] ?? 0, 6);
        }
      }
    };
    expect(at(0.85)).toEqual(EXPRESSIONS.stern);
    same(at(0.6), EXPRESSIONS.set);
    same(at(0.4), EXPRESSIONS.gritted);
    same(at(0.2), EXPRESSIONS.tired);
    same(at(0), EXPRESSIONS.spent);
    // Between steps, partway from one to the next.
    expect(at(0.5).mouth.gritted).toBeCloseTo(0.5, 5);
    expect(at(0.5).mouth.set).toBeCloseTo(0.5, 5);
    // Spent, her eyes are nearly closed.
    expect(eyesShut(at(0))).toBeGreaterThan(0.6);
    // Lewd and sure of herself, she keeps some of her smirk to the end.
    expect(at(0, BEARING.confident).mouth.confident).toBeGreaterThan(0);
  });

  it("wears one of her expression's close variants, as KP's pools do", () => {
    // Variant 0 is the expression itself; each other takes a part, or a share of one, from a close expression.
    expect(withVariant(EXPRESSIONS.smile, "smile", 0)).toEqual(EXPRESSIONS.smile);
    const closed = withVariant(EXPRESSIONS.smile, "smile", 1);
    expect(closed.mouth).toEqual({ smile: 0.5, shy: 0.5 });
    expect(closed.brows).toEqual(EXPRESSIONS.smile.brows);
    expect(withVariant(EXPRESSIONS.smile, "smile", 1 + VARIANTS.smile.length + 1)).toEqual(closed);
    // A whole part handed over, and a look moved.
    expect(withVariant(EXPRESSIONS.stern, "stern", 1).mouth).toEqual({ set: 1 });
    expect(withVariant(EXPRESSIONS.shy, "shy", 1).lookX).toBeCloseTo(EXPRESSIONS.shy.lookX - 1, 6);
    // Every part still adds up to no more than all of it, none below 0.
    for (const e of EXPRESSIONS_LIST) {
      for (let v = 0; v <= VARIANTS[e].length; v++) {
        const shape = withVariant(EXPRESSIONS[e], e, v);
        for (const part of FACE_PARTS) {
          const weights = Object.values(shape[part]) as number[];
          for (const w of weights) expect(w).toBeGreaterThanOrEqual(0);
          expect(weights.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1 + 1e-9);
        }
        expect(shape.blink).toBeGreaterThanOrEqual(0);
        expect(shape.blink).toBeLessThanOrEqual(1);
      }
    }
    // Angry's variants leave the brows the user drew alone.
    for (const variant of VARIANTS.angry) expect(Object.keys(variant)).toEqual(["mouth"]);
    // Of a blend, a variant hands over only its own expression's share.
    const blend = blendFace(EXPRESSIONS.stern, EXPRESSIONS.neutral, 0.5);
    expect(withVariant(blend, "stern", 1).mouth).toEqual({ set: 0.5, neutral: 0.5 });
    // In her face: the variant is of what leads it, and none in a brawl's own face.
    expect(faceFor({ ...calm, moment: "tipped", variant: 1 })).toEqual(closed);
    const fightFace = { ...EXPRESSIONS.angry };
    expect(faceFor({ ...calm, fighting: true, fightFace, variant: 1 })).toEqual({ ...fightFace, sweat: EXTRAS.sweatFighting });
  });

  it("goes heavy-lidded and flushed as she's aroused or drunk", () => {
    expect(faceFor(calm)).toEqual(EXPRESSIONS.stern);
    const aroused = faceFor({ ...calm, arousal: 1 });
    expect(aroused.blink).toBeGreaterThan(0);
    expect(eyesShut(aroused)).toBeCloseTo(HEAVY_LIDS.arousal, 6);
    expect(aroused.blush).toBeGreaterThan(0);
    expect(faceFor({ ...calm, drunk: 1 }).blush).toBeGreaterThan(0);
    // Never less than the expression's own: sultry's lids are already heavier, so nothing's shut further.
    expect(faceFor({ ...calm, showing: SULTRY_PAST, arousal: 1 }).blink).toBe(0);
    expect(faceFor({ ...calm, showing: BASHFUL_BELOW, arousal: 0.1 }).blush).toBe(EXPRESSIONS.shy.blush);
    // Her pupils widen as she's aroused or drunk, over her expression's own.
    expect(faceFor({ ...calm, arousal: 1 }).pupil).toBeGreaterThan(0.5);
    expect(EXPRESSIONS.surprised.pupil).toBeLessThan(0);
  });

  it("eases from one expression to the next", () => {
    const half = blendFace(REST_FACE, EXPRESSIONS.smile, 0.5);
    expect(half.mouth.smile).toBeCloseTo(0.5);
    const eased = easeFace(REST_FACE, EXPRESSIONS.smile, 0.05);
    expect(eased.mouth.smile).toBeGreaterThan(0);
    expect(eased.mouth.smile).toBeLessThan(1);
    expect(faceMoved(REST_FACE, REST_FACE)).toBe(false);
    expect(faceMoved(REST_FACE, eased)).toBe(true);
    // From one expression to another, one's keys give way to the other's.
    const between = blendFace(EXPRESSIONS.angry, EXPRESSIONS.smile, 0.25);
    expect(between.brows).toEqual({ angry: 0.75, smile: 0.25 });
  });

  it("gives her face's shape keys their weights: each part's keys, her blink over her eyes', her look and pupils", () => {
    // 24 expressions' brows, eyes and mouth (neutral is her face at rest), and the 7 keys over them.
    expect(FACE_KEY_NAMES.length).toBe(24 * 3 + 7);
    expect(new Set(FACE_KEY_NAMES).size).toBe(FACE_KEY_NAMES.length);
    expect([...faceKeyWeights(REST_FACE)]).toEqual([]);
    expect([...faceKeyWeights(EXPRESSIONS.neutral)]).toEqual([]);
    const angry = faceKeyWeights(EXPRESSIONS.angry);
    expect(Object.fromEntries(angry)).toEqual({ Brow_angry: 1, Eye_angry: 1, Mouth_angry: 1, Pupil_Small: 0.4 });
    // Blinking, her eyes' keys give way to Blink; her brows and mouth don't.
    const blinking = faceKeyWeights({ ...EXPRESSIONS.angry, blink: 0.5 });
    expect(blinking.get("Eye_angry")).toBeCloseTo(0.5);
    expect(blinking.get("Blink")).toBeCloseTo(0.5);
    expect(blinking.get("Brow_angry")).toBe(1);
    // Her look, each way to its own key.
    const shy = faceKeyWeights(EXPRESSIONS.shy);
    expect(shy.get("Look_Right")).toBe(EXPRESSIONS.shy.lookX);
    expect(shy.get("Look_Down")).toBe(-EXPRESSIONS.shy.lookY);
    expect(shy.has("Look_Left")).toBe(false);
    // Every key named is one of hers.
    for (const e of EXPRESSIONS_LIST) for (const name of faceKeyWeights({ ...EXPRESSIONS[e], blink: 0.3, lookX: -0.2, lookY: 0.2, pupil: 0.5 }).keys()) {
      expect(FACE_KEY_NAMES).toContain(name);
    }
  });

  it("presses her lips thin where her mouth's key does, for their colour", () => {
    expect(mouthPress(EXPRESSIONS.bashful)).toBe(1);
    expect(mouthPress(EXPRESSIONS.smile)).toBe(0);
    expect(mouthPress(blendFace(EXPRESSIONS.bashful, EXPRESSIONS.neutral, 0.5))).toBeCloseTo(0.5);
  });

  it("shuts her lids only as far as asked, over her eyes' own", () => {
    expect(eyesShut(EXPRESSIONS.neutral)).toBe(0);
    expect(eyesShut(EXPRESSIONS.tired)).toBeCloseTo(0.55);
    expect(eyesShut({ ...EXPRESSIONS.neutral, blink: 1 })).toBe(1);
    const heavy = shutAtLeast(EXPRESSIONS.stern, 0.4);
    expect(eyesShut(heavy)).toBeCloseTo(0.4, 6);
    expect(shutAtLeast(EXPRESSIONS.tired, 0.4)).toBe(EXPRESSIONS.tired);
  });

  it("brings on KP's extras: sweat as she wears down, wet eyes once she's at ease, hearts only when she's fully gone", () => {
    // Sweat: none while she's fresh, a few drops partway, all of it near the end; and in a brawl.
    expect(faceFor({ ...calm, will: 1 }).sweat).toBe(0);
    expect(faceFor({ ...calm, will: 0.45 }).sweat).toBeGreaterThanOrEqual(FACE_EXTRAS.sweat[0]);
    expect(faceFor({ ...calm, will: 0.2 }).sweat).toBeGreaterThanOrEqual(FACE_EXTRAS.sweat[1]);
    expect(faceFor({ ...calm, fighting: true }).sweat).toBeGreaterThanOrEqual(FACE_EXTRAS.sweat[0]);
    // Wet eyes as she's aroused, but not while she's still proper (KP's lv1 resists).
    expect(faceFor({ ...calm, arousal: 1 }).wet).toBe(0);
    expect(faceFor({ ...calm, slut: BEARING.easy, arousal: 1 }).wet).toBeGreaterThanOrEqual(FACE_EXTRAS.wet);
    // Hearts only sure of herself, worked right up, in a face of pleasure.
    const gone = { ...calm, slut: BEARING.confident, arousal: 0.9, reaction: "melt" as const };
    expect(faceFor(gone).heart).toBe(1);
    expect(faceFor({ ...gone, arousal: 0.5 }).heart).toBe(0);
    expect(faceFor({ ...gone, slut: BEARING.easy }).heart).toBe(0);
    expect(faceFor({ ...calm, slut: BEARING.confident, arousal: 0.9 }).heart).toBe(0);
    // Tears where she's pushed too far.
    expect(EXPRESSIONS.strained.tears).toBeGreaterThanOrEqual(FACE_EXTRAS.tears);
    expect(EXPRESSIONS.neutral.tears).toBe(0);
  });

});
