import { describe, expect, it } from "vitest";
import { addPaintTo, overlayBits, PAINT_OVERLAYS, PAINT_SKIN_NAMES } from "../src/game/paint";

describe("painted layers", () => {
  it("marks each overlay layer's bit, and none for replace layers", () => {
    expect(overlayBits([])).toBe(0);
    expect(overlayBits([{ mode: "overlay" }])).toBe(1);
    expect(overlayBits([{ mode: "replace" }, { mode: "overlay" }, {}])).toBe(2);
    expect(overlayBits([{ mode: "overlay" }, {}, { mode: "overlay" }])).toBe(5);
  });

  it("lays her skin detail only on her skin's materials", () => {
    for (const name of ["T_skin_f", "T_face_skin", "T_face_mid", "T_face_blush", "T_lip", "T_lip_lit", "T_navel", "T_anus_skin"]) {
      expect(PAINT_SKIN_NAMES.test(name)).toBe(true);
    }
    for (const name of ["T_bra", "T_smalls", "T_nail", "T_labia", "T_vulva", "T_areola", "T_eye_iris", "T_skin", "T_hair_f"]) {
      expect(PAINT_SKIN_NAMES.test(name)).toBe(false);
    }
  });

  it("hooks the layers and the body's detail into a material's shader", () => {
    const shader = {
      uniforms: {},
      vertexShader: "void main() {\n#include <uv_vertex>\n}",
      fragmentShader: "void main() {\n#include <color_fragment>\n}",
    } as unknown as Parameters<typeof addPaintTo>[0];
    addPaintTo(shader, "T_face_skin");
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    expect(uniforms.uPaintSkin.value).toBe(1);
    expect(uniforms.uPaintOverlays).toBe(PAINT_OVERLAYS);
    expect(shader.vertexShader).toContain("vSkinDetail = _skin_detail;");
    expect(shader.fragmentShader).toContain("textureGrad(uPaintLayers");
    const other = { ...shader, uniforms: {} } as typeof shader;
    addPaintTo(other, "T_bra");
    expect((other.uniforms as Record<string, { value: unknown }>).uPaintSkin.value).toBe(0);
  });
});
