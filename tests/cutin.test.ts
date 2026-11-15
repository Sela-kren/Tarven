import { describe, expect, it } from "vitest";
import { CUT_INS, cutKindFor, spankLevel, type CutKind } from "../src/game/cutin";

describe("Karryn-style cut-ins", () => {
  it("give a spank or a grab on her behind its own cut-in", () => {
    expect(cutKindFor("smack", "rear")).toBe("spank");
    expect(cutKindFor("scuffleSpank", "rear")).toBe("spank");
    expect(cutKindFor("grab", "rear")).toBe("butt");
  });

  it("knead her breasts, and pinch for a pinch", () => {
    expect(cutKindFor("bothHands", "chest")).toBe("breasts");
    expect(cutKindFor("pinch", "chest")).toBe("nipples");
  });

  it("go for her clit once a hand between her legs is bold", () => {
    expect(cutKindFor("thighUp", "intimate", 4)).toBe("pussy");
    expect(cutKindFor("thighUp", "intimate", 9)).toBe("clit");
  });

  it("frame her clit as KP does: a close-up from between her spread legs, one hand circling it", () => {
    const clit = CUT_INS.clit;
    expect(clit.view).toBe("between");
    expect(clit.closeUp).toBeDefined();
    expect(clit.legs?.raise).toBeGreaterThan(0);
    expect(clit.legs?.out).toBeGreaterThan(0);
    expect(clit.hands).toBe(1);
    expect(clit.motion).toBe("circle");
    expect(clit.loop).toBeCloseTo(0.44, 2);
    expect(clit.format).toBe("tall");
  });

  it("tell a kiss, a deep kiss and fingers in her mouth apart", () => {
    expect(cutKindFor("kiss", "lips")).toBe("kissed");
    expect(cutKindFor("deepKiss", "lips")).toBe("deepKiss");
    expect(cutKindFor("scuffleMouth", "lips")).toBe("fingers");
  });

  it("leave a plain touch, or one with no hand, to the plain shot", () => {
    expect(cutKindFor("grab", "shoulder")).toBeNull();
    expect(cutKindFor("gaze", "face")).toBeNull();
    expect(cutKindFor("grab", "chest", 4, true)).toBeNull();
  });

  it("spank harder the bolder the touch, KP's three levels", () => {
    expect(spankLevel(2)).toBe(1);
    expect(spankLevel(6)).toBe(2);
    expect(spankLevel(9)).toBe(3);
  });

  it("put both his hands on her where KP does, and his body in the shot for a kiss or her hand on him", () => {
    for (const kind of ["breasts", "nipples", "butt", "anal"] as CutKind[]) expect(CUT_INS[kind].hands).toBe(2);
    expect(CUT_INS.kissed.partner).toBe("kiss");
    expect(CUT_INS.stroke.partner).toBe("crotch");
    for (const cut of Object.values(CUT_INS)) {
      expect(cut.loop).toBeGreaterThan(0);
      expect(cut.shape).toMatch(/^polygon\(/);
    }
  });
});
