import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  HalfFloatType,
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
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

/** Target lines on screen: the PS1's high-resolution mode, so faces stay readable. */
const RETRO_HEIGHT = 480;
/** Lines of the grid that vertices snap to: coarser than the image, so models still wobble. */
const SNAP_HEIGHT = 240;
/** Brightness steps per colour channel on screen (5-bit colour). */
const COLOR_LEVELS = 31;

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

function makeTextureRetro(texture: Texture | null): void {
  if (!texture) return;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
}

function toRetroMaterial(source: MeshStandardMaterial): MeshLambertMaterial {
  makeTextureRetro(source.map);
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

/** Adds the PS1's two rasterizer quirks: vertices snapped to a grid and affine (warping) textures. */
function withPs1Rasterizer<T extends MeshLambertMaterial | MeshPhongMaterial>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = snapResolution;
    shader.vertexShader = `${AFFINE_VARYINGS}uniform vec2 uSnap;\n${shader.vertexShader}`.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap * 0.5 + 0.5)
        / (uSnap * 0.5) * gl_Position.w;
      #ifdef USE_MAP
        vAffineMapUv = vec3(vMapUv * gl_Position.w, gl_Position.w);
      #endif
      #ifdef USE_EMISSIVEMAP
        vAffineEmissiveUv = vec3(vEmissiveMapUv * gl_Position.w, gl_Position.w);
      #endif`,
    );
    shader.fragmentShader = `${AFFINE_VARYINGS}${shader.fragmentShader}`
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
  material.customProgramCacheKey = () => "retro-ps1";
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

        void main() {
          ivec2 pixel = ivec2(gl_FragCoord.xy / uScale);
          vec3 scene = texelFetch(tScene, pixel, 0).rgb;
          if (uDrunk > 0.0) {
            // Drunk: the rows ripple sideways, and a second, faded copy of the room drifts around the first.
            ivec2 last = textureSize(tScene, 0) - 1;
            float wave = sin(float(pixel.y) * 0.06 + uTime * 2.0) * uDrunk * DRUNK_WAVE;
            ivec2 wavy = clamp(pixel + ivec2(int(round(wave)), 0), ivec2(0), last);
            vec2 drift = vec2(sin(uTime * 0.8), cos(uTime * 0.6)) * uDrunk * DRUNK_DOUBLE;
            ivec2 ghost = clamp(wavy + ivec2(round(drift)), ivec2(0), last);
            scene = mix(texelFetch(tScene, wavy, 0).rgb, texelFetch(tScene, ghost, 0).rgb, DRUNK_GHOST * uDrunk);
          }
          vec3 color = linearToSrgb(clamp(scene, 0.0, 1.0));
          float threshold = BAYER[(pixel.x & 3) + ((pixel.y & 3) << 2)] / 16.0 - 0.46875;
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

  resize(windowWidth: number, windowHeight: number): void {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(windowWidth, windowHeight);

    // A whole number of physical pixels per game pixel keeps every pixel the same size and sharp.
    const screen = this.renderer.getDrawingBufferSize(new Vector2());
    const scale = Math.max(1, Math.round(screen.y / RETRO_HEIGHT));
    const width = Math.ceil(screen.x / scale);
    const height = Math.ceil(screen.y / scale);
    this.target.setSize(width, height);
    snapResolution.value.set(Math.round((SNAP_HEIGHT * width) / height), SNAP_HEIGHT);
    this.postMaterial.uniforms.uScale.value = scale;
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
