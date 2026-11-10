import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Scene,
} from "three";
import type { WorldClock } from "./time";

/** The light that fills a scene, at one end of the day. */
interface Mood {
  ambient: number;
  ambientIntensity: number;
  sky: number;
  ground: number;
  hemisphereIntensity: number;
  /** What an outdoor scene shows behind everything. */
  background: number;
}

const NIGHT: Mood = {
  ambient: 0x6a6480,
  ambientIntensity: 0.55,
  sky: 0x8fa4d0,
  ground: 0x2a1a10,
  hemisphereIntensity: 0.5,
  background: 0x0a0e1e,
};
const DAY: Mood = {
  ambient: 0xd8cfc0,
  ambientIntensity: 1.05,
  sky: 0xcfe0ff,
  ground: 0x6a4a30,
  hemisphereIntensity: 0.95,
  background: 0x8ec0ea,
};
/** The sky's colour around sunrise and sunset. */
const TWILIGHT_SKY = 0xe0885a;

const SUN_HIGH = 0xfff2d8;
const SUN_LOW = 0xff9a50;
const SUN_INTENSITY = 1.6;
/** The sun's height at which its light has lost its sunset colour. */
const SUN_WHITE_HEIGHT = 0.45;
const SUN_DISTANCE = 20;
/** Sunlight comes from this side of the world (-Z, the tavern's window wall). */
const SUN_SIDE = -0.6;

/** Brightness of sky-lit glass at night and in full day, and its colour at dusk. */
const GLOW_NIGHT = 1;
const GLOW_DAY = 3.2;
const GLOW_TWILIGHT = 0xffb070;

export interface LightingOptions {
  /** Paint the background with the sky's colour. For outdoor scenes; indoors the background is left alone. */
  sky?: boolean;
}

/**
 * Lights a scene from the world clock: a sun that crosses the sky east to west, ambient light that warms and
 * brightens by day, and glass lit by the sky outside. Works the same for any scene, inside or out.
 */
export class DayNightLighting {
  readonly ambient = new AmbientLight();
  readonly hemisphere = new HemisphereLight();
  readonly sun = new DirectionalLight();
  private readonly glow: MeshLambertMaterial[] = [];
  private readonly scratch = new Color();

  constructor(
    private readonly scene: Scene,
    private readonly options: LightingOptions = {},
  ) {
    // The sun casts no shadows: indoors it would need the walls to block it, which is not worth the cost yet.
    this.sun.castShadow = false;
    scene.add(this.ambient, this.hemisphere, this.sun, this.sun.target);
  }

  /** Makes every material named in `names` under `root` glow with the sky outside, like window glass. */
  addSkyGlow(root: Object3D, names: string[]): void {
    const wanted = new Set(names);
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof MeshLambertMaterial && wanted.has(material.name) && !this.glow.includes(material)) {
          this.glow.push(material);
        }
      }
    });
  }

  apply(clock: WorldClock): void {
    const day = clock.daylight;
    // Strongest halfway through dawn or dusk.
    const twilight = day * (1 - day) * 4;
    const blend = (night: number, noon: number, target: Color) =>
      target.setHex(night).lerp(this.scratch.setHex(noon), day);

    blend(NIGHT.ambient, DAY.ambient, this.ambient.color);
    this.ambient.intensity = NIGHT.ambientIntensity + (DAY.ambientIntensity - NIGHT.ambientIntensity) * day;
    blend(NIGHT.sky, DAY.sky, this.hemisphere.color);
    blend(NIGHT.ground, DAY.ground, this.hemisphere.groundColor);
    this.hemisphere.intensity =
      NIGHT.hemisphereIntensity + (DAY.hemisphereIntensity - NIGHT.hemisphereIntensity) * day;

    // East (-X) at sunrise, overhead at noon, west (+X) at sunset.
    const across = Math.PI * Math.min(1, Math.max(0, clock.sunProgress));
    const height = Math.max(0.05, clock.sunHeight);
    this.sun.position.set(-Math.cos(across), height, SUN_SIDE).normalize().multiplyScalar(SUN_DISTANCE);
    this.sun.intensity = SUN_INTENSITY * day;
    const white = Math.min(1, Math.max(0, clock.sunHeight / SUN_WHITE_HEIGHT));
    this.sun.color.setHex(SUN_LOW).lerp(this.scratch.setHex(SUN_HIGH), white);

    for (const material of this.glow) {
      material.emissiveIntensity = GLOW_NIGHT + (GLOW_DAY - GLOW_NIGHT) * day;
      material.emissive.setHex(0xffffff).lerp(this.scratch.setHex(GLOW_TWILIGHT), twilight * 0.7);
    }

    if (this.options.sky) {
      const background = this.scene.background instanceof Color ? this.scene.background : new Color();
      blend(NIGHT.background, DAY.background, background).lerp(this.scratch.setHex(TWILIGHT_SKY), twilight * 0.6);
      this.scene.background = background;
    }
  }
}
