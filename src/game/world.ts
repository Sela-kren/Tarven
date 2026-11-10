import { Box3, BufferGeometry, Material, Mesh, Object3D, PointLight, Vector3 } from "three";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Rect } from "./collision";
import type { SeatSpec } from "./house";
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
const NO_SHADOW_CASTERS = new Set([
  "Floor", "Rug", "Window", "Fire", "BarLantern", "Bedroom_Floor", "Bedroom_Rug", "Bedroom_Window",
]);

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
  /** The table this seat is at ("A", "B", "C"), or "Bar" for a bar stool. */
  table: string;
}

const CHAIR_HEIGHT = 0.5;
const STOOL_HEIGHT = 0.61;
const TABLE_HEIGHT = 0.79;
const BAR_HEIGHT = 1.1;
const APPROACH_DISTANCE = 0.6;
const PLATE_REACH = 0.55;

export interface World {
  /** The loaded room. */
  root: Object3D;
  colliders: Rect[];
  spawn: Vector3;
  /** Filled in from the building plan. */
  seats: Seat[];
  /** Objects left whole instead of merged into the room, by name, so the game can outline them. */
  pieces: Map<string, Object3D>;
  update(time: number): void;
}

/** Turns a seat from the building plan into the positions guests and dishes use. */
export function makeSeat(spec: SeatSpec): Seat {
  const position = new Vector3(spec.x, 0, spec.z);
  const toTarget = new Vector3(spec.targetX - spec.x, 0, spec.targetZ - spec.z).normalize();
  const plate = position.clone().addScaledVector(toTarget, PLATE_REACH);
  plate.y = spec.atBar ? BAR_HEIGHT : TABLE_HEIGHT;
  return {
    position,
    heading: Math.atan2(-toTarget.x, -toTarget.z),
    height: spec.kind === "chair" ? CHAIR_HEIGHT : STOOL_HEIGHT,
    approach: position.clone().addScaledVector(toTarget, -APPROACH_DISTANCE),
    plate,
    table: spec.table,
  };
}

/** Cuts a piece of the building up so its textures warp like the rest of the room, and frees the original. */
export function tessellateForRetro(geometry: BufferGeometry): BufferGeometry {
  const cut = new TessellateModifier(MAX_WORLD_EDGE, MAX_TESSELLATE_PASSES).modify(geometry);
  geometry.dispose();
  return cut;
}

/**
 * Combines the static room into one mesh per material. Every separate mesh is a
 * draw call, repeated for each shadow-map face, so this is the main performance win.
 */
function mergeStaticMeshes(root: Object3D, pieces: ReadonlySet<Object3D>): void {
  interface Bucket {
    material: Material;
    castShadow: boolean;
    geometries: BufferGeometry[];
  }
  const buckets = new Map<string, Bucket>();
  const sources: Mesh[] = [];

  const tessellator = new TessellateModifier(MAX_WORLD_EDGE, MAX_TESSELLATE_PASSES);
  const insidePiece = (object: Object3D): boolean => {
    for (let at: Object3D | null = object; at; at = at.parent) if (pieces.has(at)) return true;
    return false;
  };

  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
    if (insidePiece(object)) {
      // Left where it is, but cut up the same way so its textures warp like the rest of the room.
      const geometry: BufferGeometry = object.geometry;
      object.geometry = tessellator.modify(geometry);
      geometry.dispose();
      return;
    }
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

/** `whole` names the objects to keep apart from the merged room, such as furniture the player uses. */
export function setupWorld(root: Object3D, whole: readonly string[] = []): World {
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

  const pieces = new Map<string, Object3D>();
  for (const name of whole) {
    const piece = root.getObjectByName(name);
    if (!piece) throw new Error(`world.glb is missing "${name}"`);
    pieces.set(name, piece);
  }
  mergeStaticMeshes(root, new Set(pieces.values()));

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
    root,
    colliders,
    spawn,
    seats: [],
    pieces,
    update(time) {
      for (const { light, base, amount, phase } of flickers) {
        const wobble = Math.sin(time * 9 + phase) * 0.5 + Math.sin(time * 23.7 + phase * 2) * 0.5;
        light.intensity = base * (1 + wobble * amount);
      }
    },
  };
}
