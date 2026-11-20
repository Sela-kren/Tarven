import {
  DataArrayTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type WebGLProgramParametersWithUniforms,
} from "three";

/**
 * Hand-painted texture layers from the Blender bridge (tools/blender/tarven_bridge/paint.py): one 2K picture per
 * Blender object (her body, her hair, a dress), painted on the object's second UV map ("Paint", glTF's TEXCOORD_1).
 * The retro materials (retro.ts) lay it over their own colour by its alpha, so the materials, their names and the
 * look's recolours all stay as they are wherever she isn't painted.
 *
 * All the pictures are one texture array, the same for every material (materials are shared between meshes, and
 * three only sends a shared material's uniforms when the material changes). Which layer a mesh paints from is in its
 * UVs: the bridge sends an object's Paint UVs moved right by 1 + its layer, so u in [1 + layer, 2 + layer). A mesh
 * without the UV map reads (0, 0) and isn't painted.
 *
 * Sent as public/models/paint/<body>.json ({ size, layers: [{ object, file, mode }] }) with the pictures beside it.
 *
 * A layer's mode: "replace" (the default) lays the picture over the material's colour by its alpha; "overlay" is a
 * detail map (her skin's, tools/blender/tarven_bridge/skin_texture.py) that multiplies the colour by its RGB x 2
 * (0.5 grey leaves it as it is), by its alpha, and only on her skin's materials (PAINT_SKIN_NAMES), so her look's
 * skin tones and blushes still recolour her and her band, braies, nails and so on stay as they are. Her body's
 * points carry the same detail where the picture doesn't reach (the "_skin_detail" attribute, the multiplier as
 * 1 + 2 x it, so a mesh without it reads none), as her body can't be cut into the picture without splitting her
 * points.
 */
const NONE = new DataArrayTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, 1);
NONE.needsUpdate = true;

/** The shader's uniform: shared by every retro material, so the pictures loaded show on all of them. */
export const PAINT_LAYERS = { value: NONE };
/** Which layers are overlays (bit i for layer i), shared like the pictures. */
export const PAINT_OVERLAYS = { value: 0 };

/** The materials her skin detail (overlay layers and the body's points) multiplies: her skin, face tones and lips. */
export const PAINT_SKIN_NAMES = /^(T_skin_f|T_face_[a-z_]+|T_lip|T_lip_lit|T_navel|T_anus_skin)$/;

export type PaintMode = "replace" | "overlay";

/** The bits for PAINT_OVERLAYS: one per layer sent as an overlay. */
export function overlayBits(layers: readonly { mode?: PaintMode }[]): number {
  return layers.reduce((bits, layer, i) => (layer.mode === "overlay" && i < 31 ? bits | (1 << i) : bits), 0);
}

const PAINT_VERTEX = `#ifndef USE_UV1
attribute vec2 uv1;
#endif
attribute vec3 _skin_detail;
varying vec2 vPaintUv;
varying vec3 vSkinDetail;
`;
const PAINT_FRAGMENT = `uniform highp sampler2DArray uPaintLayers;
uniform int uPaintOverlays;
uniform float uPaintSkin;
varying vec2 vPaintUv;
varying vec3 vSkinDetail;
// An overlay's RGB as it was painted (the array decodes sRGB): the multiplier, halved.
vec3 paintEncoded(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
`;
// The picture's mip level from the UVs' screen derivatives, taken outside the branch (they're undefined inside it).
const PAINT_GLSL = `#include <color_fragment>
{
  vec2 paintDx = dFdx(vPaintUv);
  vec2 paintDy = dFdy(vPaintUv);
  if (vPaintUv.x >= 1.0) {
    float paintLayer = floor(vPaintUv.x) - 1.0;
    vec4 painted = textureGrad(uPaintLayers, vec3(fract(vPaintUv.x), vPaintUv.y, paintLayer), paintDx, paintDy);
    if (((uPaintOverlays >> int(paintLayer)) & 1) == 0) {
      diffuseColor.rgb = mix(diffuseColor.rgb, painted.rgb, painted.a);
    } else {
      diffuseColor.rgb *= mix(vec3(1.0), paintEncoded(painted.rgb) * 2.0, painted.a * uPaintSkin);
    }
  } else if (vPaintUv.x < -1.0) {
    // Her body's points (the bridge sends their Paint UVs far off the pictures, so other meshes never read this).
    diffuseColor.rgb *= 1.0 + 2.0 * vSkinDetail * uPaintSkin;
  }
}`;

/**
 * Lays the painted layers over a material's own colour (in its onBeforeCompile): the room's retro materials and the
 * close-ups' skin alike. A mesh without the Paint UV map reads (0, 0) and isn't painted. `name` is the material's:
 * her skin's (PAINT_SKIN_NAMES) take the overlay layers and her body's detail; the rest don't.
 */
export function addPaintTo(shader: WebGLProgramParametersWithUniforms, name = ""): void {
  shader.uniforms.uPaintLayers = PAINT_LAYERS;
  shader.uniforms.uPaintOverlays = PAINT_OVERLAYS;
  // Per material (the program is shared): only the skin's take the detail.
  shader.uniforms.uPaintSkin = { value: PAINT_SKIN_NAMES.test(name) ? 1 : 0 };
  shader.vertexShader =
    PAINT_VERTEX +
    shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nvPaintUv = uv1;\nvSkinDetail = _skin_detail;");
  shader.fragmentShader = PAINT_FRAGMENT + shader.fragmentShader.replace("#include <color_fragment>", PAINT_GLSL);
}

interface Manifest {
  size: number;
  layers: { object: string; file: string; mode?: PaintMode }[];
}

function pixelsOf(image: HTMLImageElement | ImageBitmap, size: number): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, size, size);
  return context.getImageData(0, 0, size, size).data;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

/** Loads a body's painted layers, if it has any (a missing manifest is no paint, not an error). */
export async function loadPaint(base: string, body: string): Promise<void> {
  let manifest: Manifest;
  try {
    const response = await fetch(`${base}models/paint/${body}.json`, { cache: "no-store" });
    if (!response.ok) return;
    manifest = (await response.json()) as Manifest;
  } catch {
    return;
  }
  const { size, layers } = manifest;
  if (!layers?.length) return;
  const data = new Uint8Array(size * size * 4 * layers.length);
  await Promise.all(
    layers.map(async ({ file }, i) => {
      try {
        // Its premultiplied edges aren't wanted: the canvas keeps straight alpha for a fully opaque or clear pixel,
        // which is what painting leaves almost everywhere.
        const image = await loadImage(`${base}models/paint/${file}?${Date.now()}`);
        data.set(pixelsOf(image, size), i * size * size * 4);
      } catch {
        // A picture that won't load leaves that layer clear.
      }
    }),
  );
  const texture = new DataArrayTexture(data, size, size, layers.length);
  texture.format = RGBAFormat;
  texture.type = UnsignedByteType;
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  // Mipmapped: her skin detail is seen small in the room (the pictures fill round their islands, so no seams).
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  PAINT_LAYERS.value = texture;
  PAINT_OVERLAYS.value = overlayBits(layers);
}
