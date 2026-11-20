import { DataArrayTexture, LinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType, type WebGLProgramParametersWithUniforms } from "three";

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
 * Sent as public/models/paint/<body>.json ({ size, layers: [{ object, file }] }) with the pictures beside it.
 */
const NONE = new DataArrayTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, 1);
NONE.needsUpdate = true;

/** The shader's uniform: shared by every retro material, so the pictures loaded show on all of them. */
export const PAINT_LAYERS = { value: NONE };

const PAINT_VERTEX = `#ifndef USE_UV1
attribute vec2 uv1;
#endif
varying vec2 vPaintUv;
`;
const PAINT_FRAGMENT = `uniform highp sampler2DArray uPaintLayers;
varying vec2 vPaintUv;
`;
const PAINT_GLSL = `#include <color_fragment>
if (vPaintUv.x >= 1.0) {
  vec4 painted = texture(uPaintLayers, vec3(fract(vPaintUv.x), vPaintUv.y, floor(vPaintUv.x) - 1.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, painted.rgb, painted.a);
}`;

/**
 * Lays the painted layers over a material's own colour (in its onBeforeCompile): the room's retro materials and the
 * close-ups' skin alike. A mesh without the Paint UV map reads (0, 0) and isn't painted.
 */
export function addPaintTo(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uPaintLayers = PAINT_LAYERS;
  shader.vertexShader = PAINT_VERTEX + shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nvPaintUv = uv1;");
  shader.fragmentShader = PAINT_FRAGMENT + shader.fragmentShader.replace("#include <color_fragment>", PAINT_GLSL);
}

interface Manifest {
  size: number;
  layers: { object: string; file: string }[];
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
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  PAINT_LAYERS.value = texture;
}
