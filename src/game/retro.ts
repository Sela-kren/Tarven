import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Material,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { addSkinDetail } from "./skindetail";
import { addPaintTo } from "./paint";
import { hexToOklab, hexToSrgb, MAX_PALETTE } from "./palettes";

/** Target lines on screen. Toned down from the PS1's 480: on a ~1080p window this is full resolution. */
const RETRO_HEIGHT = 720;
/** Lines of the grid that vertices snap to: a little coarser than the image, so models wobble only slightly. */
const SNAP_HEIGHT = 540;
/** The snap grid against the image's lines, kept when a place draws with bigger pixels (setLines). */
const SNAP_PER_LINE = SNAP_HEIGHT / RETRO_HEIGHT;
/** Brightness steps per colour channel on screen (6-bit colour: the dither is faint). */
const COLOR_LEVELS = 63;
/** The PS1's warping textures. Off: textures are drawn perspective-correct. */
const AFFINE_TEXTURES = false;
/** The screen height the drunk-vision amounts were tuned at, so they stay the same size on screen. */
const DRUNK_REFERENCE_HEIGHT = 480;

/** Shared with every retro material so vertices snap to the same grid. */
const snapResolution = { value: new Vector2(320, SNAP_HEIGHT) };

const AFFINE_VARYINGS = /* glsl */ `
  #ifdef USE_MAP
    varying vec3 vAffineMapUv;
  #endif
  #ifdef USE_EMISSIVEMAP
    varying vec3 vAffineEmissiveUv;
  #endif
`;

/**
 * Skin whose texture is a tiny (32 px) tile of soft colour noise. Drawn blocky, each of its pixels showed as a hard
 * square on her skin up close (the user, 2026-11-19): these are filtered smooth instead, so the noise reads as a
 * soft mottle. Every other texture stays blocky.
 */
const SMOOTH_SKIN_NAMES = /^(T_skin|T_skin_f|T_face_skin|T_areola|T_anus_skin|T_penis|T_glans|T_scrotum)$/;

function makeTextureRetro(texture: Texture | null, smooth = false): void {
  if (!texture) return;
  texture.magFilter = smooth ? LinearFilter : NearestFilter;
  texture.minFilter = smooth ? LinearMipmapLinearFilter : NearestFilter;
  texture.generateMipmaps = smooth;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
}

function toRetroMaterial(source: MeshStandardMaterial): MeshLambertMaterial {
  makeTextureRetro(source.map, SMOOTH_SKIN_NAMES.test(source.name));
  makeTextureRetro(source.emissiveMap);
  return withPs1Rasterizer(new MeshLambertMaterial({
    name: source.name,
    map: source.map,
    color: source.color,
    emissive: source.emissive,
    emissiveMap: source.emissiveMap,
    emissiveIntensity: source.emissiveIntensity,
    // Kept for the few see-through things.
    transparent: source.transparent,
    opacity: source.opacity,
    depthWrite: source.depthWrite,
  }));
}

/** A plain-coloured retro material, for recolouring characters and props. */
export function solidRetroMaterial(name: string, color: number): MeshLambertMaterial {
  return withPs1Rasterizer(new MeshLambertMaterial({ name, color }));
}

let coat: MeshPhongMaterial | null = null;
let stain: MeshPhongMaterial | null = null;

/**
 * How far the coat is drawn towards the camera, and further still the clothes that should cover it. Flat amounts
 * only: one that grows with the slope would pull each layer of a skirt and apron by a different amount.
 */
const COAT_OFFSET = { factor: 0, units: -6 };
const COVER_OFFSET = { factor: 0, units: -16 };
/** The stains on her clothes, a little in front of the clothes they lie on. */
const STAIN_OFFSET = { factor: 0, units: -20 };

/**
 * Draws clothing in front of the coat beneath it. The coat is pulled forwards so the vertex snapping never sinks
 * it into the skin; worn clothes are pulled further, so it never pokes through them either.
 */
export function coverCoat(material: Material): void {
  material.polygonOffset = true;
  material.polygonOffsetFactor = COVER_OFFSET.factor;
  material.polygonOffsetUnits = COVER_OFFSET.units;
}

/** The same as the coat, for where it landed on her clothes: drawn in front of the clothes, which cover the coat. */
export function stainRetroMaterial(): MeshPhongMaterial {
  if (!stain) {
    // A clone keeps the coat's look but not its compile hook, which snaps its vertices like the cloth under it.
    stain = withPs1Rasterizer(coatRetroMaterial().clone());
    stain.name = "T_cum_stain";
    stain.polygonOffsetFactor = STAIN_OFFSET.factor;
    stain.polygonOffsetUnits = STAIN_OFFSET.units;
  }
  return stain;
}

/**
 * What men leave on her skin: off-white, a little see-through, with a wet shine where the light catches it.
 * Drawn just in front of the skin it lies on, so the vertex snapping never sinks it in. One shared material.
 */
export function coatRetroMaterial(): MeshPhongMaterial {
  coat ??= withPs1Rasterizer(
    new MeshPhongMaterial({
      name: "T_cum",
      color: 0x8c8a84,
      specular: 0xffffff,
      shininess: 80,
      // Most of its white is its own light, so it stays a creamy white in the tavern's warm lamplight and in
      // shadow, instead of taking the lamp's colour like the skin under it.
      emissive: 0xb4b2aa,
      transparent: true,
      opacity: 0.96,
      polygonOffset: true,
      polygonOffsetFactor: COAT_OFFSET.factor,
      polygonOffsetUnits: COAT_OFFSET.units,
    }),
  );
  return coat;
}

/**
 * Her skin's soft glow in the room (KP's skin, kept PS1): which materials have it (her body's skin and areolae, as
 * built or tinted, which keep their names), and how: a pink sheen widening out to where her skin turns from the
 * viewer, a brighter rim tight at that edge, and a soft highlight as from a lamp up and to the left of the viewer.
 * All scaled by how lit she is there, so she doesn't glow in the dark.
 */
const SKIN_GLOW_NAMES = /^(T_skin_f|T_areola)$/;
/**
 * Her eyes' pieces (build_world.py add_anime_eyes) aren't snapped: her pupil and shines are a few millimetres across,
 * smaller than a snap step at room distance, and snapping crushed them into a blur (the user, 2026-11-19). Her lids
 * reach well past the white, so her snapped skin round them never shows a gap.
 */
const UNSNAPPED_NAMES = /^T_eye_/;
const SKIN_GLOW = {
  sheen: 0.1,
  sheenPower: 1.6,
  sheenColor: [1, 0.66, 0.66],
  rim: 0.16,
  rimPower: 3.5,
  rimColor: [1, 0.9, 0.86],
  gloss: 0.08,
  glossPower: 18,
} as const;

const vec3 = (rgb: readonly number[]) => `vec3(${rgb.map((v) => v.toFixed(3)).join(", ")})`;
const SKIN_GLOW_GLSL = `{
  vec3 glowNormal = normalize(normal);
  vec3 glowView = normalize(vViewPosition);
  float facing = clamp(dot(glowNormal, glowView), 0.0, 1.0);
  float lit = clamp(dot(gl_FragColor.rgb, vec3(0.6)), 0.15, 1.0);
  float sheen = pow(1.0 - facing, ${SKIN_GLOW.sheenPower.toFixed(1)}) * ${SKIN_GLOW.sheen.toFixed(3)};
  float rim = pow(1.0 - facing, ${SKIN_GLOW.rimPower.toFixed(1)}) * ${SKIN_GLOW.rim.toFixed(3)};
  vec3 glowHalf = normalize(normalize(vec3(-0.45, 0.6, 0.65)) + glowView);
  float gloss = pow(max(dot(glowNormal, glowHalf), 0.0), ${SKIN_GLOW.glossPower.toFixed(1)}) * ${SKIN_GLOW.gloss.toFixed(3)};
  gl_FragColor.rgb += (${vec3(SKIN_GLOW.sheenColor)} * sheen + ${vec3(SKIN_GLOW.rimColor)} * rim + vec3(gloss)) * lit;
}
#include <dithering_fragment>`;

/** Adds the PS1's two rasterizer quirks: vertices snapped to a grid and affine (warping) textures. */
function withPs1Rasterizer<T extends MeshLambertMaterial | MeshPhongMaterial>(material: T): T {
  material.onBeforeCompile = (shader) => {
    // The Blender bridge's painted layers (paint.ts), first, so the glow and detail go over them.
    addPaintTo(shader);
    if (SKIN_GLOW_NAMES.test(material.name)) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", SKIN_GLOW_GLSL);
    }
    shader.uniforms.uSnap = snapResolution;
    const snap = UNSNAPPED_NAMES.test(material.name)
      ? ""
      : `gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap * 0.5 + 0.5)
        / (uSnap * 0.5) * gl_Position.w;`;
    shader.vertexShader = `${AFFINE_VARYINGS}uniform vec2 uSnap;\n${shader.vertexShader}`.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      ${snap}
      #ifdef USE_MAP
        vAffineMapUv = vec3(vMapUv * gl_Position.w, gl_Position.w);
      #endif
      #ifdef USE_EMISSIVEMAP
        vAffineEmissiveUv = vec3(vEmissiveMapUv * gl_Position.w, gl_Position.w);
      #endif`,
    );
    shader.fragmentShader = `${AFFINE_VARYINGS}${shader.fragmentShader}`;
    if (!AFFINE_TEXTURES) return;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          diffuseColor *= texture2D(map, vAffineMapUv.xy / vAffineMapUv.z);
        #endif`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= texture2D(emissiveMap, vAffineEmissiveUv.xy / vAffineEmissiveUv.z).rgb;
        #endif`,
      );
  };
  material.customProgramCacheKey = () =>
    (SKIN_GLOW_NAMES.test(material.name) ? "retro-ps1-skin" : UNSNAPPED_NAMES.test(material.name) ? "retro-ps1-unsnapped" : "retro-ps1");
  // Her areolae's and vulva's painted detail, over the glow.
  addSkinDetail(material);
  return material;
}

/** Replaces imported materials with retro ones and turns shadows on. */
export function applyRetroLook(root: Object3D): void {
  const converted = new Map<Material, MeshLambertMaterial>();
  const convert = (material: Material): Material => {
    if (!(material instanceof MeshStandardMaterial)) return material;
    let retro = converted.get(material);
    if (!retro) {
      retro = toRetroMaterial(material);
      converted.set(material, retro);
    }
    return retro;
  };

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(convert)
      : convert(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

/** Draws the scene at low resolution, then dithers it and scales it up without smoothing. */
export class RetroPipeline {
  private readonly target = new WebGLRenderTarget(320, 240, {
    type: HalfFloatType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
  });
  private readonly postScene = new Scene();
  private readonly postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMaterial: ShaderMaterial;

  constructor(private readonly renderer: WebGLRenderer) {
    this.postMaterial = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: this.target.texture },
        uScale: { value: 1 },
        uLevels: { value: COLOR_LEVELS },
        uDrunk: { value: 0 },
        uTime: { value: 0 },
        uPaletteLab: { value: Array.from({ length: MAX_PALETTE }, () => new Vector3()) },
        uPaletteSrgb: { value: Array.from({ length: MAX_PALETTE }, () => new Vector3()) },
        uPaletteSize: { value: 0 },
        uDitherL: { value: 0 },
      },
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tScene;
        uniform float uScale;
        uniform float uLevels;
        uniform float uDrunk;
        uniform float uTime;
        // A palette to snap every pixel to (setPalette), nearest as the eye sees it: OKLab. Size 0 = no palette.
        uniform vec3 uPaletteLab[${MAX_PALETTE}];
        uniform vec3 uPaletteSrgb[${MAX_PALETTE}];
        uniform int uPaletteSize;
        uniform float uDitherL;

        // Drunk vision, at full drunkenness: how many game pixels the rows ripple and the double image drifts,
        // and how strong the double image is.
        const float DRUNK_WAVE = 2.5;
        const float DRUNK_DOUBLE = 5.0;
        const float DRUNK_GHOST = 0.45;

        const float BAYER[16] = float[16](
           0.0,  8.0,  2.0, 10.0,
          12.0,  4.0, 14.0,  6.0,
           3.0, 11.0,  1.0,  9.0,
          15.0,  7.0, 13.0,  5.0
        );

        vec3 linearToSrgb(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
        }

        // Linear sRGB to OKLab (Ottosson 2020); the same maths as palettes.ts. Matrices are column by column.
        vec3 linearToOklab(vec3 c) {
          vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619,
                          0.5363325363, 0.6806995451, 0.2817188376,
                          0.0514459929, 0.1073969566, 0.6299787005) * c;
          lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
          return mat3(0.2104542553, 1.9779984951, 0.0259040371,
                      0.7936177850, -2.4285922050, 0.7827717662,
                      -0.0040720468, 0.4505937099, -0.8086757660) * lms;
        }

        void main() {
          ivec2 pixel = ivec2(gl_FragCoord.xy / uScale);
          vec3 scene = texelFetch(tScene, pixel, 0).rgb;
          if (uDrunk > 0.0) {
            // Drunk: the rows ripple sideways, and a second, faded copy of the room drifts around the first.
            ivec2 last = textureSize(tScene, 0) - 1;
            // The amounts were tuned at 480 lines; keep them the same size on screen at any resolution.
            float px = float(textureSize(tScene, 0).y) / ${DRUNK_REFERENCE_HEIGHT.toFixed(1)};
            float wave = sin(float(pixel.y) * 0.06 / px + uTime * 2.0) * uDrunk * DRUNK_WAVE * px;
            ivec2 wavy = clamp(pixel + ivec2(int(round(wave)), 0), ivec2(0), last);
            vec2 drift = vec2(sin(uTime * 0.8), cos(uTime * 0.6)) * uDrunk * DRUNK_DOUBLE * px;
            ivec2 ghost = clamp(wavy + ivec2(round(drift)), ivec2(0), last);
            scene = mix(texelFetch(tScene, wavy, 0).rgb, texelFetch(tScene, ghost, 0).rgb, DRUNK_GHOST * uDrunk);
          }
          float threshold = BAYER[(pixel.x & 3) + ((pixel.y & 3) << 2)] / 16.0 - 0.46875;
          if (uPaletteSize > 0) {
            // Pixel art: the palette colour nearest this pixel, with an optional dither on lightness only.
            vec3 lab = linearToOklab(clamp(scene, 0.0, 1.0));
            lab.x += threshold * uDitherL;
            float best = 1e9;
            int pick = 0;
            for (int i = 0; i < ${MAX_PALETTE}; i++) {
              if (i >= uPaletteSize) break;
              vec3 d = lab - uPaletteLab[i];
              float dist = dot(d, d);
              if (dist < best) { best = dist; pick = i; }
            }
            gl_FragColor = vec4(uPaletteSrgb[pick], 1.0);
            return;
          }
          vec3 color = linearToSrgb(clamp(scene, 0.0, 1.0));
          color = floor((color + threshold / uLevels) * uLevels + 0.5) / uLevels;
          gl_FragColor = vec4(color, 1.0);
        }`,
    });

    const triangle = new BufferGeometry();
    triangle.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const quad = new Mesh(triangle, this.postMaterial);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  /** Lines on screen: RETRO_HEIGHT, or fewer for bigger pixels in a place (setLines). */
  private lines = RETRO_HEIGHT;
  private windowSize = new Vector2(1, 1);
  private palette: readonly string[] | null = null;

  resize(windowWidth: number, windowHeight: number): void {
    this.windowSize.set(windowWidth, windowHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(windowWidth, windowHeight);

    // A whole number of physical pixels per game pixel keeps every pixel the same size and sharp.
    const screen = this.renderer.getDrawingBufferSize(new Vector2());
    const scale = Math.max(1, Math.round(screen.y / this.lines));
    const width = Math.ceil(screen.x / scale);
    const height = Math.ceil(screen.y / scale);
    this.target.setSize(width, height);
    const snapLines = Math.round(this.lines * SNAP_PER_LINE);
    snapResolution.value.set(Math.round((snapLines * width) / height), snapLines);
    this.postMaterial.uniforms.uScale.value = scale;
  }

  /** Draws with about this many lines on screen (bigger pixels for fewer), or the game's own RETRO_HEIGHT if null. */
  setLines(lines: number | null): void {
    const wanted = lines ?? RETRO_HEIGHT;
    if (wanted === this.lines) return;
    this.lines = wanted;
    this.resize(this.windowSize.x, this.windowSize.y);
  }

  /**
   * Snaps every pixel to the nearest colour of `palette` ("rrggbb" strings, up to MAX_PALETTE), as the eye sees it,
   * or back to the game's usual colour steps if null. `dither` (0 = none) shades between neighbouring lightnesses.
   * Cheap to call every frame: nothing changes unless the palette does.
   */
  setPalette(palette: readonly string[] | null, dither = 0): void {
    const uniforms = this.postMaterial.uniforms;
    uniforms.uDitherL.value = dither;
    if (palette === this.palette) return;
    this.palette = palette;
    const colours = (palette ?? []).slice(0, MAX_PALETTE);
    colours.forEach((hex, i) => {
      (uniforms.uPaletteLab.value as Vector3[])[i].fromArray(hexToOklab(hex));
      (uniforms.uPaletteSrgb.value as Vector3[])[i].fromArray(hexToSrgb(hex));
    });
    uniforms.uPaletteSize.value = colours.length;
  }

  /** Wobbles the picture: `amount` from 0 (sober, untouched) to 1. `time` in seconds keeps it moving. */
  setDrunk(amount: number, time: number): void {
    this.postMaterial.uniforms.uDrunk.value = amount;
    this.postMaterial.uniforms.uTime.value = time;
  }

  render(scene: Scene, camera: Camera): void {
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
