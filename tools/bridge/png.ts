/**
 * A small PNG reader for the bridge server: her textures' average colours, which the game reads off a canvas
 * (appearance.ts textureAverage) and Node has none of. 8-bit, non-interlaced: greyscale, RGB, palette, grey+alpha,
 * RGBA, which covers every texture build_world.py writes.
 */
import { inflateSync } from "node:zlib";

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** The picture as RGBA bytes, or null for one this can't read. */
export function decodePng(data: Uint8Array): { width: number; height: number; rgba: Uint8Array } | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0) !== 0x89504e47) return null;
  let offset = 8;
  let width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  let palette: Uint8Array | null = null;
  let alpha: Uint8Array | null = null;
  const chunks: Uint8Array[] = [];
  while (offset < data.length) {
    const length = view.getUint32(offset);
    const name = String.fromCharCode(...data.subarray(offset + 4, offset + 8));
    const body = data.subarray(offset + 8, offset + 8 + length);
    if (name === "IHDR") {
      const h = new DataView(body.buffer, body.byteOffset, body.byteLength);
      width = h.getUint32(0);
      height = h.getUint32(4);
      depth = body[8];
      type = body[9];
      interlace = body[12];
    } else if (name === "PLTE") palette = body;
    else if (name === "tRNS") alpha = body;
    else if (name === "IDAT") chunks.push(body);
    else if (name === "IEND") break;
    offset += 12 + length;
  }
  const channels = CHANNELS[type];
  if (depth !== 8 || interlace !== 0 || !channels) return null;
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const up = y ? pixels.subarray((y - 1) * stride, y * stride) : new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = up[x];
      const c = x >= channels ? up[x - channels] : 0;
      let value = src[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = value & 0xff;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = pixels.subarray(i * channels, (i + 1) * channels);
    let r: number, g: number, b: number, a = 255;
    if (type === 3) {
      r = palette![p[0] * 3];
      g = palette![p[0] * 3 + 1];
      b = palette![p[0] * 3 + 2];
      if (alpha && p[0] < alpha.length) a = alpha[p[0]];
    } else if (type === 0 || type === 4) {
      r = g = b = p[0];
      if (type === 4) a = p[1];
    } else {
      [r, g, b] = [p[0], p[1], p[2]];
      if (type === 6) a = p[3];
    }
    rgba.set([r, g, b, a], i * 4);
  }
  return { width, height, rgba };
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** Its average colour, linear, as the game works it out (every pixel alike, alpha ignored). */
export function averageLinear(data: Uint8Array): [number, number, number] | null {
  const image = decodePng(data);
  if (!image) return null;
  let r = 0, g = 0, b = 0;
  const count = image.width * image.height;
  for (let i = 0; i < count; i++) {
    r += srgbToLinear(image.rgba[i * 4] / 255);
    g += srgbToLinear(image.rgba[i * 4 + 1] / 255);
    b += srgbToLinear(image.rgba[i * 4 + 2] / 255);
  }
  return [r / count, g / count, b / count];
}
