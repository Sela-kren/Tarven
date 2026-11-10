import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

/** Sprite size in game pixels; shown scaled up without smoothing, like the rest of the game. */
const WIDTH = 220;
const HEIGHT = 360;
/** 5-bit colour, matching the game's dithered screen. */
const LEVELS = 31;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * Renders a character from the knees up as a visual novel standing sprite: lit from the front,
 * transparent behind. `turn` angles the body towards the middle of the screen.
 */
export function renderPortrait(renderer: WebGLRenderer, character: Object3D, turn: number): HTMLCanvasElement {
  const scene = new Scene();
  scene.add(new AmbientLight(0x6a6480, 0.9));
  scene.add(new HemisphereLight(0xb8c4e0, 0x3a2414, 0.7));
  const key = new DirectionalLight(0xffd0a0, 2.6);
  key.position.set(-1.5, 2.5, 3);
  const rim = new DirectionalLight(0x8fa4d0, 2.2);
  rim.position.set(2, 2, -2.5);
  scene.add(key, rim);

  const model = cloneSkinned(character);
  model.position.set(0, 0, 0);
  // The model faces -Z at rest; turn it round to face the camera.
  model.rotation.set(0, Math.PI + turn, 0);
  model.visible = true;
  scene.add(model);

  const camera = new PerspectiveCamera(24, WIDTH / HEIGHT, 0.1, 20);
  camera.position.set(0, 1.3, 3.1);
  camera.lookAt(0, 1.28, 0);

  const target = new WebGLRenderTarget(WIDTH, HEIGHT);
  const previousColor = renderer.getClearColor(new Color());
  const previousAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  renderer.readRenderTargetPixels(target, 0, 0, WIDTH, HEIGHT, pixels);
  renderer.setRenderTarget(null);
  renderer.setClearColor(previousColor, previousAlpha);
  target.dispose();

  // Render targets hold linear colour: convert to sRGB and dither down, flipping rows to top-down.
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const from = ((HEIGHT - 1 - y) * WIDTH + x) * 4;
      const to = (y * WIDTH + x) * 4;
      const alpha = pixels[from + 3];
      if (alpha < 128) continue;
      const threshold = (BAYER4[(x & 3) + ((y & 3) << 2)] / 16 - 0.46875) / LEVELS;
      for (let c = 0; c < 3; c++) {
        const srgb = linearToSrgb(pixels[from + c] / 255);
        image.data[to + c] = Math.round(Math.min(1, Math.max(0, Math.round((srgb + threshold) * LEVELS) / LEVELS)) * 255);
      }
      image.data[to + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
