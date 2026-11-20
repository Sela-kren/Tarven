/**
 * Grass for the town (TOWN_DAY.md step 3): the three.js port of `tools/blender/build_grass.py`, itself after
 * Dylearn's Godot grass ("How I made grass better than 99% of games"). The Blender file's node maths is the spec;
 * the `[m:ss]` marks are where the video shows each idea.
 *
 * - Every blade is one quad drawn many times (instanced), cut into tiles so the camera skips the ones it can't see.
 * - A blade faces the camera [0:34], bends with world-space wind from two drifting noises [3:04] played back at a
 *   stepped 8 frames a second with a phase per blade [7:59], and leans away from anyone walking through it [9:34].
 * - Its colour comes from patches of world-space noise [2:10], the same patches the ground under it is painted
 *   with, so grass and ground read as one. A few blades are accents, taller and darker or short and yellow [2:36],
 *   and a few are flowers in white, pink and blue.
 * - It's lit by the scene's own lights (the world clock's sun and sky, lighting.ts) as if it were the ground under
 *   it, every blade with the ground's upward normal. No toon steps and no cloud shadows: nothing else in the town
 *   has them, and the grass would stand out.
 *
 * `plantGrass` is pure (where the blades go); `GrassField` draws and moves them.
 */
import {
  BufferAttribute,
  Color,
  DataTexture,
  FrontSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Mesh,
  MeshLambertMaterial,
  NoColorSpace,
  RGBAFormat,
  Sphere,
  Vector3,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from "three";
import type { Rect } from "./collision";

// ---------------------------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------------------------

/** The grass's settings: build_grass.py CONFIG, in the game's units (metres, radians, seconds). */
export const GRASS = {
  /** Blades per square metre. The town camera is far off; the ground under them carries the same colours. */
  density: 16,
  /** A blade sprite's height, and how much smaller one may be (as a share). */
  quadSize: 0.32,
  sizeJitter: 0.3,
  /** Accents and flowers: how often each comes up, how much bigger, and how much taller on top of that. */
  accent1: { chance: 0.05, scale: 1.15, height: 1.4 },
  accent2: { chance: 0.04, scale: 0.7, height: 0.9 },
  flower: { chance: 0.035, scale: 1.7, height: 1.25 },
  /** The wind: which way it blows (x, z), how fast its noise drifts, its size, the two noises' spread and the most a blade bends. */
  windDirection: [1, 0.4] as const,
  windSpeed: 0.8,
  windScale: 0.25,
  windDivergence: (25 * Math.PI) / 180,
  windMaxAngle: (35 * Math.PI) / 180,
  /** A small side-to-side sway on top, across the camera, so still air still lives. */
  sway: (4 * Math.PI) / 180,
  /** Frames a second the wind is played back at: stepped, not smooth [7:59]. */
  fps: 8,
  /** How far someone pushes blades aside (metres), how sharply it falls off, and the most a blade leans from it. */
  pushRadius: 0.55,
  pushExponent: 2,
  pushAngle: (60 * Math.PI) / 180,
  /** Tiles the field is cut into, metres across. */
  tile: 10,
} as const;

/** The colours: the ground's grass and its two patch colours, the accents, and the flowers. sRGB hex. */
export const GRASS_COLORS = {
  grass: 0x5d8a3a,
  patch1: 0x6f9c42,
  patch2: 0x4a7330,
  patch1Scale: 0.35,
  patch1Threshold: 0.52,
  patch2Scale: 0.22,
  patch2Threshold: 0.55,
  accent1: 0x3f6a26,
  accent2: 0xb3b44c,
  petals: [0xf4f0e8, 0xe88aa8, 0x8a9af0] as readonly number[],
  centre: 0xf0c838,
} as const;

/** How many people can push the grass at once: her and the townsfolk nearest her. */
export const MAX_PUSHERS = 16;

/** A blade's kind, as the shader reads it: 0 plain, 1 flower, 2 short yellow accent, 3 tall dark accent. */
export type BladeKind = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------------------------------------------
// Planting (pure)
// ---------------------------------------------------------------------------------------------------------------

export interface Blade {
  x: number;
  z: number;
  width: number;
  height: number;
  kind: BladeKind;
  /** 0 to 1: picks a flower's petal colour. */
  rand: number;
}

/** A blade's kind from a roll in 0 to 1, by the accents' and flowers' chances [2:36]. */
export function bladeKind(roll: number): BladeKind {
  const a1 = GRASS.accent1.chance;
  const a2 = a1 + GRASS.accent2.chance;
  const fl = a2 + GRASS.flower.chance;
  return roll < a1 ? 3 : roll < a2 ? 2 : roll < fl ? 1 : 0;
}

/**
 * Where the blades go: scattered over `area` at `density` a square metre, none inside any of `bare` (roads,
 * paths, buildings). The same `rand` gives the same field.
 */
export function plantGrass(area: Rect, bare: readonly Rect[], rand: () => number, density: number = GRASS.density): Blade[] {
  const blades: Blade[] = [];
  const count = Math.round((area.maxX - area.minX) * (area.maxZ - area.minZ) * density);
  const sprite = GRASS.quadSize;
  for (let i = 0; i < count; i++) {
    const x = area.minX + rand() * (area.maxX - area.minX);
    const z = area.minZ + rand() * (area.maxZ - area.minZ);
    const kind = bladeKind(rand());
    const size = 1 - GRASS.sizeJitter * rand();
    const rollColour = rand();
    if (bare.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ)) continue;
    const look = kind === 3 ? GRASS.accent1 : kind === 2 ? GRASS.accent2 : kind === 1 ? GRASS.flower : { scale: 1, height: 1 };
    const height = sprite * size * look.scale * look.height;
    blades.push({ x, z, width: sprite * 0.8 * size * look.scale, height, kind, rand: rollColour });
  }
  return blades;
}

// ---------------------------------------------------------------------------------------------------------------
// Sprites (build_grass.py _sprite_image, _flower_image)
// ---------------------------------------------------------------------------------------------------------------

const SPRITE_W = 16;
const SPRITE_H = 20;

/**
 * A grass sprite drawn from blades (x at the base, x at the tip, height as a share, half-width at the base), as
 * build_grass.py draws it: R is the shade (darker at the base, lit tip), A the cut-out. Row 0 is the bottom.
 */
export function grassSprite(blades: readonly (readonly [number, number, number, number])[]): Uint8Array {
  const px = new Uint8Array(SPRITE_W * SPRITE_H * 4);
  // Clear texels keep a mid shade, not black, so smoothing at a blade's edge doesn't darken it.
  for (let i = 0; i < SPRITE_W * SPRITE_H; i++) px[i * 4] = 204;
  for (const [xb, xt, bh, bw] of blades) {
    const top = Math.floor(bh * (SPRITE_H - 1));
    for (let y = 0; y <= top; y++) {
      const t = y / Math.max(top, 1);
      const x = xb + (xt - xb) * t * t;
      const half = Math.max(bw * (1 - t), 0.5);
      const shade = y === top ? 1 : 0.7 + 0.3 * t;
      for (let xi = Math.round(x - half); xi <= Math.round(x + half); xi++) {
        if (xi < 0 || xi >= SPRITE_W) continue;
        const i = (y * SPRITE_W + xi) * 4;
        px[i] = Math.round(shade * 255);
        px[i + 3] = 255;
      }
    }
  }
  return px;
}

/** The flower sprite: R the shade, G where the petals are, B its centre, A the cut-out. */
export function flowerSprite(): Uint8Array {
  const px = new Uint8Array(SPRITE_W * SPRITE_H * 4);
  for (let i = 0; i < SPRITE_W * SPRITE_H; i++) px[i * 4] = 204;
  const put = (x: number, y: number, shade: number, petal = 0, centre = 0) => {
    if (x < 0 || x >= SPRITE_W || y < 0 || y >= SPRITE_H) return;
    const i = (y * SPRITE_W + x) * 4;
    px.set([Math.round(shade * 255), petal * 255, centre * 255, 255], i);
  };
  const cx = 8;
  const head = 14;
  for (let y = 0; y < head; y++) put(cx + (y >= 5 && y < 10 ? 1 : 0), y, 0.7 + (0.2 * y) / head);
  for (const [x, y] of [[6, 4], [5, 5], [10, 6], [11, 7]]) put(x, y, 0.85);
  const petals = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [-2, 1], [2, -1], [-1, 2], [1, -2]];
  for (const [dx, dy] of petals) put(cx + dx, head + dy, dy >= 0 ? 1 : 0.85, 1);
  put(cx, head, 1, 0, 1);
  return px;
}

const CLUMP_BLADES = [[7.5, 2, 0.7, 1.2], [7.5, 7, 1, 1.4], [8, 13, 0.8, 1.2], [6.5, 4.5, 0.5, 1], [9, 11, 0.55, 1]] as const;
const ACCENT_BLADES = [[7.5, 8.5, 1, 0.9], [7.5, 3, 0.45, 0.8], [8, 12.5, 0.55, 0.8]] as const;

function spriteTexture(data: Uint8Array): DataTexture {
  const texture = new DataTexture(data, SPRITE_W, SPRITE_H, RGBAFormat);
  // Soft blades for the painted look (the skill's "Linear"); the cut-out stays sharp through the alpha test.
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// ---------------------------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------------------------

/** Value noise in 0 to 1 and the patch colours: shared by the grass and the ground under it. */
const NOISE_GLSL = /* glsl */ `
  float grassHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float grassNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(grassHash(i), grassHash(i + vec2(1.0, 0.0)), u.x),
               mix(grassHash(i + vec2(0.0, 1.0)), grassHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // Two octaves, as Blender's noise with detail 2.
  float grassNoise2(vec2 p) { return 0.667 * grassNoise(p) + 0.333 * grassNoise(p * 2.03 + 17.0); }
`;

const PATCH_GLSL = /* glsl */ `
  uniform vec3 uGrass;
  uniform vec3 uPatch1;
  uniform vec3 uPatch2;
  uniform vec4 uPatchShape; // patch 1's scale and threshold, patch 2's scale and threshold
  vec3 grassPatch(vec2 p) {
    float n1 = grassNoise2(p * uPatchShape.x);
    float n2 = grassNoise2((p + vec2(37.1, 11.3)) * uPatchShape.z);
    vec3 c = mix(uGrass, uPatch1, smoothstep(uPatchShape.y - 0.01, uPatchShape.y + 0.01, n1));
    return mix(c, uPatch2, smoothstep(uPatchShape.w - 0.01, uPatchShape.w + 0.01, n2));
  }
`;

function patchUniforms() {
  return {
    uGrass: { value: new Color(GRASS_COLORS.grass) },
    uPatch1: { value: new Color(GRASS_COLORS.patch1) },
    uPatch2: { value: new Color(GRASS_COLORS.patch2) },
    uPatchShape: {
      value: [GRASS_COLORS.patch1Scale, GRASS_COLORS.patch1Threshold, GRASS_COLORS.patch2Scale, GRASS_COLORS.patch2Threshold],
    },
  };
}

/**
 * The ground under the grass, painted in the same patches as the blades (by where it is in the world), and lit as
 * the rest of the town is.
 */
export function grassGroundMaterial(): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ name: "Street_grassGround", color: 0xffffff });
  const uniforms = patchUniforms();
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec2 vGrassXZ;\n${shader.vertexShader}`.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vGrassXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`,
    );
    shader.fragmentShader = `varying vec2 vGrassXZ;\n${NOISE_GLSL}\n${PATCH_GLSL}\n${shader.fragmentShader}`.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      diffuseColor.rgb *= grassPatch(vGrassXZ);`,
    );
  };
  material.customProgramCacheKey = () => "tarven-grass-ground";
  return material;
}

const GRASS_VERTEX = /* glsl */ `
  attribute vec3 aBase;
  attribute vec2 aSize;
  attribute float aKind;
  attribute float aRand;
  uniform float uTime;
  uniform vec2 uWindDir;
  uniform vec4 uWind; // speed, scale, divergence, most bend
  uniform vec3 uMotion; // frames a second, sway, push lean
  uniform vec3 uPush[${MAX_PUSHERS}];
  uniform int uPushCount;
  uniform float uPushExponent;
  varying vec2 vGrassXZ;
  varying float vKind;
  varying float vRand;
  vec2 grassTurn(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;

const GRASS_PROJECT = /* glsl */ `
  vec3 base = (modelMatrix * vec4(aBase, 1.0)).xyz;
  // [7:59] Stepped time, each blade a little out of step with the next.
  float frame = 1.0 / uMotion.x;
  float stepped = floor((uTime + grassHash(base.xz) * frame) / frame) * frame;
  // [3:04] Wind: two noise samples drifting apart, multiplied, so gusts roll through rather than ripple.
  float drift = stepped * uWind.x;
  float n1 = grassNoise(base.xz * uWind.y - grassTurn(uWindDir, uWind.z) * drift);
  float n2 = grassNoise(base.xz * uWind.y * 0.785398 - grassTurn(uWindDir, -uWind.z) * drift * 1.570796);
  vec2 bend = uWindDir * clamp(n1 * n2 * 4.0 - 0.6, 0.0, 1.0) * uWind.w;
  // [9:34] Anyone near pushes it away from them.
  vec2 push = vec2(0.0);
  for (int i = 0; i < ${MAX_PUSHERS}; i++) {
    if (i >= uPushCount) break;
    vec2 away = base.xz - uPush[i].xy;
    float near = length(away);
    float reach = pow(1.0 - clamp(near / max(uPush[i].z, 1e-4), 0.0, 1.0), uPushExponent);
    if (near > 1e-4) push += away / near * reach;
  }
  bend += clamp(push, -1.0, 1.0) * uMotion.z;
  // [0:34] Facing the camera; a small sway across it on top.
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  bend += normalize(right.xz) * sin(stepped * 2.3 + aRand * 6.2832) * uMotion.y;
  float lean = length(bend);
  vec3 toward = lean > 1e-5 ? vec3(bend.x, 0.0, bend.y) / lean : vec3(0.0);
  float rise = position.y * aSize.y;
  vec3 world = base + right * position.x * aSize.x + up * rise
    + toward * sin(lean) * rise - vec3(0.0, (1.0 - cos(lean)) * rise, 0.0);
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vGrassXZ = base.xz;
  vKind = aKind;
  vRand = aRand;
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform sampler2D uClump;
  uniform sampler2D uAccent;
  uniform sampler2D uFlower;
  uniform vec3 uAccent1;
  uniform vec3 uAccent2;
  uniform vec3 uPetals[3];
  uniform vec3 uCentre;
  varying vec2 vGrassXZ;
  varying float vKind;
  varying float vRand;
`;

const GRASS_COLOR = /* glsl */ `
  vec3 patchColour = grassPatch(vGrassXZ);
  vec3 bladeColour;
  float cut;
  if (vKind < 0.5) {
    vec4 t = texture2D(uClump, vMapUv);
    bladeColour = patchColour * t.r;
    cut = t.a;
  } else if (vKind < 1.5) {
    // A flower: its stem in the grass's colour, petals in one of three, a yellow middle.
    vec4 t = texture2D(uFlower, vMapUv);
    vec3 petal = vRand < 0.3333 ? uPetals[0] : vRand < 0.6667 ? uPetals[1] : uPetals[2];
    bladeColour = mix(mix(patchColour, petal, t.g), uCentre, t.b) * t.r;
    cut = t.a;
  } else {
    vec4 t = texture2D(uAccent, vMapUv);
    bladeColour = (vKind > 2.5 ? uAccent1 : uAccent2) * t.r;
    cut = t.a;
  }
  if (cut < 0.5) discard;
  diffuseColor.rgb *= bladeColour;
`;

function grassMaterial(uniforms: Record<string, { value: unknown }>): MeshLambertMaterial {
  // A map is set only so three gives the shader its uv (vMapUv); the colour comes from the sprites below.
  const material = new MeshLambertMaterial({ name: "Street_grass", color: 0xffffff, side: FrontSide });
  material.map = uniforms.uClump.value as DataTexture;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `${GRASS_VERTEX}\n${NOISE_GLSL}\n${shader.vertexShader}`
      .replace("#include <project_vertex>", GRASS_PROJECT)
      // Lit as the ground under it: every blade with the ground's normal, straight up.
      .replace(
        "#include <defaultnormal_vertex>",
        `#include <defaultnormal_vertex>
        transformedNormal = normalize(mat3(viewMatrix) * vec3(0.0, 1.0, 0.0));`,
      );
    shader.fragmentShader = `${GRASS_FRAGMENT}\n${NOISE_GLSL}\n${PATCH_GLSL}\n${shader.fragmentShader}`.replace(
      "#include <map_fragment>",
      GRASS_COLOR,
    );
  };
  material.customProgramCacheKey = () => "tarven-grass";
  return material;
}

// ---------------------------------------------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------------------------------------------

/** Someone pushing the grass: where they stand in the world, and how far they reach (GRASS.pushRadius if left out). */
export interface Pusher {
  x: number;
  z: number;
  radius?: number;
}

/** A field of grass: its tiles under `root`, moved each frame by `update`. */
export class GrassField {
  readonly root = new Group();
  readonly material: Material;
  readonly bladeCount: number;
  private readonly uniforms: Record<string, { value: unknown }>;

  constructor(blades: readonly Blade[]) {
    this.root.name = "Street_grass";
    const petals = GRASS_COLORS.petals.map((hex) => new Color(hex));
    const sprites = {
      uClump: spriteTexture(grassSprite(CLUMP_BLADES)),
      uAccent: spriteTexture(grassSprite(ACCENT_BLADES)),
      uFlower: spriteTexture(flowerSprite()),
    };
    // The sprites are masks and shades, not colours: no colour-space conversion on them.
    for (const t of Object.values(sprites)) t.colorSpace = NoColorSpace;
    const [dx, dz] = GRASS.windDirection;
    const windLength = Math.hypot(dx, dz);
    this.uniforms = {
      ...patchUniforms(),
      uClump: { value: sprites.uClump },
      uAccent: { value: sprites.uAccent },
      uFlower: { value: sprites.uFlower },
      uAccent1: { value: new Color(GRASS_COLORS.accent1) },
      uAccent2: { value: new Color(GRASS_COLORS.accent2) },
      uPetals: { value: petals },
      uCentre: { value: new Color(GRASS_COLORS.centre) },
      uTime: { value: 0 },
      uWindDir: { value: [dx / windLength, dz / windLength] },
      uWind: { value: [GRASS.windSpeed, GRASS.windScale, GRASS.windDivergence, GRASS.windMaxAngle] },
      uMotion: { value: [GRASS.fps, GRASS.sway, GRASS.pushAngle] },
      uPush: { value: Array.from({ length: MAX_PUSHERS }, () => new Vector3()) },
      uPushCount: { value: 0 },
      uPushExponent: { value: GRASS.pushExponent },
    };
    this.material = grassMaterial(this.uniforms);
    this.bladeCount = blades.length;

    // Cut into tiles, each its own mesh, so the camera draws only the ones in view.
    const tiles = new Map<string, Blade[]>();
    for (const blade of blades) {
      const key = `${Math.floor(blade.x / GRASS.tile)},${Math.floor(blade.z / GRASS.tile)}`;
      let tile = tiles.get(key);
      if (!tile) tiles.set(key, (tile = []));
      tile.push(blade);
    }
    const corners = new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]);
    const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const index = new BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1);
    for (const [key, tile] of tiles) {
      const geometry = new InstancedBufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(corners, 3));
      geometry.setAttribute("uv", new BufferAttribute(uv, 2));
      geometry.setIndex(index);
      geometry.setAttribute("aBase", new InstancedBufferAttribute(new Float32Array(tile.flatMap((b) => [b.x, 0, b.z])), 3));
      geometry.setAttribute("aSize", new InstancedBufferAttribute(new Float32Array(tile.flatMap((b) => [b.width, b.height])), 2));
      geometry.setAttribute("aKind", new InstancedBufferAttribute(new Float32Array(tile.map((b) => b.kind)), 1));
      geometry.setAttribute("aRand", new InstancedBufferAttribute(new Float32Array(tile.map((b) => b.rand)), 1));
      geometry.instanceCount = tile.length;
      const [tx, tz] = key.split(",").map(Number);
      const half = GRASS.tile / 2;
      // Round the whole tile, with room for the tallest blade bending out of it.
      geometry.boundingSphere = new Sphere(new Vector3((tx + 0.5) * GRASS.tile, 0.3, (tz + 0.5) * GRASS.tile), Math.SQRT2 * half + 1);
      const mesh = new Mesh(geometry, this.material);
      mesh.name = `Street_grass_${key}`;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.root.add(mesh);
    }
  }

  /** Moves the grass: the wind at `time` seconds, and the people walking through it (the first MAX_PUSHERS). */
  update(time: number, pushers: readonly Pusher[]): void {
    this.uniforms.uTime.value = time;
    const slots = this.uniforms.uPush.value as Vector3[];
    const count = Math.min(MAX_PUSHERS, pushers.length);
    for (let i = 0; i < count; i++) slots[i].set(pushers[i].x, pushers[i].z, pushers[i].radius ?? GRASS.pushRadius);
    this.uniforms.uPushCount.value = count;
  }
}
