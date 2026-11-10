import { Box3, BufferGeometry, Material, Mesh, Object3D, PointLight, Vector3 } from "three";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Rect } from "./collision";
import { applyRetroLook } from "./retro";

interface LightStyle {
  color: number;
  intensity: number;
  distance: number;
  shadow: boolean;
  flicker: number;
}

const LIGHT_STYLES: Record<string, LightStyle> = {
  fire: { color: 0xff7a2a, intensity: 45, distance: 14, shadow: true, flicker: 0.22 },
  lantern: { color: 0xffb060, intensity: 14, distance: 10, shadow: true, flicker: 0.06 },
  candle: { color: 0xffb56b, intensity: 3.5, distance: 5, shadow: false, flicker: 0.14 },
};

/** Longest allowed triangle edge in the room, so affine textures warp without tearing apart. */
const MAX_WORLD_EDGE = 0.8;
const MAX_TESSELLATE_PASSES = 12;

/** Meshes that glow should not block the light they are supposed to be giving off. */
const NO_SHADOW_CASTERS = new Set(["Floor", "Rug", "Window", "Fire", "BarLantern"]);

interface FlickerLight {
  light: PointLight;
  base: number;
  amount: number;
  phase: number;
}

export interface Seat {
  /** Floor position of the chair or stool. */
  position: Vector3;
  /** Rotation that faces the table or bar. */
  heading: number;
  /** Height of the seat surface. */
  height: number;
  /** Open floor beside the seat, where a guest walks to before sitting. */
  approach: Vector3;
  /** Where food lands on the table in front of this seat. */
  plate: Vector3;
}

const CHAIR_HEIGHT = 0.5;
const STOOL_HEIGHT = 0.61;
const TABLE_HEIGHT = 0.79;
const BAR_HEIGHT = 1.1;
const BAR_Z = -2.9;
const APPROACH_DISTANCE = 0.6;
const PLATE_REACH = 0.55;

export interface World {
  colliders: Rect[];
  spawn: Vector3;
  seats: Seat[];
  update(time: number): void;
}

/** Works out each seat from the names of the chairs, stools and tables in the room. */
function findSeats(root: Object3D): Seat[] {
  const seats: Seat[] = [];
  root.traverse((object) => {
    const match = /^(Chair|Stool)_(A|B|C|Bar)/.exec(object.name);
    // Each material of a model is a child with a similar name; only the parent is the seat.
    if (!match || !object.userData.collide) return;

    const position = object.getWorldPosition(new Vector3());
    const atBar = match[2] === "Bar";
    const target = new Vector3(position.x, 0, BAR_Z);
    if (!atBar) {
      const table = root.getObjectByName(`Table_${match[2]}`);
      if (!table) throw new Error(`No table found for ${object.name}`);
      table.getWorldPosition(target);
    }

    const toTarget = target.clone().sub(position).setY(0).normalize();
    const plate = position.clone().addScaledVector(toTarget, PLATE_REACH);
    plate.y = atBar ? BAR_HEIGHT : TABLE_HEIGHT;
    seats.push({
      position,
      heading: Math.atan2(-toTarget.x, -toTarget.z),
      height: match[1] === "Chair" ? CHAIR_HEIGHT : STOOL_HEIGHT,
      approach: position.clone().addScaledVector(toTarget, -APPROACH_DISTANCE),
      plate,
    });
  });
  return seats;
}

/**
 * Combines the static room into one mesh per material. Every separate mesh is a
 * draw call, repeated for each shadow-map face, so this is the main performance win.
 */
function mergeStaticMeshes(root: Object3D): void {
  interface Bucket {
    material: Material;
    castShadow: boolean;
    geometries: BufferGeometry[];
  }
  const buckets = new Map<string, Bucket>();
  const sources: Mesh[] = [];

  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
    const material: Material = object.material;
    const key = `${material.uuid}:${object.castShadow}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material, castShadow: object.castShadow, geometries: [] };
      buckets.set(key, bucket);
    }
    bucket.geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
    sources.push(object);
  });

  for (const source of sources) {
    source.removeFromParent();
    source.geometry.dispose();
  }

  const tessellator = new TessellateModifier(MAX_WORLD_EDGE, MAX_TESSELLATE_PASSES);
  for (const { material, castShadow, geometries } of buckets.values()) {
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error(`Could not merge meshes using ${material.name}`);
    geometries.forEach((g) => g.dispose());
    const geometry = tessellator.modify(merged);
    merged.dispose();
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

export function setupWorld(root: Object3D): World {
  applyRetroLook(root);
  root.updateMatrixWorld(true);

  const colliders: Rect[] = [];
  const flickers: FlickerLight[] = [];
  const spawn = new Vector3();
  const anchors: Object3D[] = [];

  root.traverse((object) => {
    if (NO_SHADOW_CASTERS.has(object.name) || object.name.startsWith("Candle_")) {
      object.traverse((child) => (child.castShadow = false));
    }
    if (object.userData.collide) {
      const box = new Box3().setFromObject(object);
      colliders.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
    }
    if (object.name === "PlayerSpawn") object.getWorldPosition(spawn);
    if (object.userData.light) anchors.push(object);
  });

  const seats = findSeats(root);
  mergeStaticMeshes(root);

  anchors.forEach((anchor, index) => {
    const style = LIGHT_STYLES[String(anchor.userData.light)];
    if (!style) throw new Error(`Unknown light type on ${anchor.name}`);
    const light = new PointLight(style.color, style.intensity, style.distance, 2);
    if (style.shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = style.distance;
      light.shadow.bias = -0.003;
    }
    anchor.add(light);
    flickers.push({ light, base: style.intensity, amount: style.flicker, phase: index * 1.7 });
  });

  return {
    colliders,
    spawn,
    seats,
    update(time) {
      for (const { light, base, amount, phase } of flickers) {
        const wobble = Math.sin(time * 9 + phase) * 0.5 + Math.sin(time * 23.7 + phase * 2) * 0.5;
        light.intensity = base * (1 + wobble * amount);
      }
    },
  };
}
