import { Box3, Group, Material, Mesh, Object3D, Vector3 } from "three";
import type { Rect } from "./collision";
import { box } from "./furnishings";

/**
 * What the rooms need when the camera is down at her level (viewmode.ts, third and first person) and the top-down view
 * would rather not have: a ceiling over every room (the underside of the floor above, planks and beams), and the
 * south walls built up to full height, which the top-down view keeps cut down to a sill so it can see in.
 * All of it is hidden in the top-down view and out of doors.
 */

/** The rooms' walls are this tall; the ceiling sits on them. */
export const CEILING_HEIGHT = 3.2;
const CEILING_THICKNESS = 0.12;
/** Beams across the ceiling, running east-west, this far apart and this deep. */
const BEAM_SPACING = 2.4;
export const BEAM_DEPTH = 0.22;
const BEAM_WIDTH = 0.2;
/** A wall lower than this is a sill wall cut down for the top-down view. */
const SILL_TALLEST = 1;
const STONE_TILE = 0.5;
/** How far past the building the ceiling reaches, metres. */
const CEILING_MARGIN = 4;

/** Everything shown only in the close views; the house's own upper walls join as the plan is rebuilt (houseview.ts). */
const parts = new Set<Object3D>();
let shown = false;

/** Adds something that shows only in the close views. */
export function addCloseViewPart(part: Object3D): void {
  part.visible = shown;
  parts.add(part);
}

export function removeCloseViewPart(part: Object3D): void {
  parts.delete(part);
}

/** Shows or hides the ceiling and the full-height walls. */
export function showCloseView(on: boolean): void {
  if (on === shown) return;
  shown = on;
  for (const part of parts) part.visible = on;
}

/** The upper part of a sill wall, from its top up to the ceiling. */
export function upperWall(rect: Rect, from: number, material: Material, tile = STONE_TILE): Mesh {
  const mesh = new Mesh(box([rect.minX, from, rect.minZ], [rect.maxX, CEILING_HEIGHT, rect.maxZ], { tile }), material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds the ceiling over the whole building and the upper parts of its sill walls. Call before setupWorld merges the
 * room's meshes, while the walls still have their names; add the result to the scene afterwards.
 */
export function buildCloseShell(root: Object3D): Group {
  const shell = new Group();
  shell.name = "CloseViewShell";
  root.updateMatrixWorld(true);
  const bounds = new Box3();
  const size = new Vector3();

  // The cut-down walls: named ..._Wall_S or ..._Front_W/E, and low.
  root.traverse((object) => {
    if (!/Wall|_Front_/.test(object.name) || !(object.children.length > 0 || object instanceof Mesh)) return;
    if (object.parent && /Wall|_Front_/.test(object.parent.name)) return;
    bounds.setFromObject(object);
    if (bounds.isEmpty()) return;
    bounds.getSize(size);
    if (bounds.max.y > SILL_TALLEST || bounds.min.y < -0.1) return;
    let material: Material | null = null;
    object.traverse((child) => {
      if (!material && child instanceof Mesh) material = child.material as Material;
    });
    if (!material) return;
    shell.add(upperWall(
      { minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z },
      bounds.max.y,
      material,
    ));
  });

  // The ceiling over the whole building, with room to spare for the rooms she builds on later (houseview.ts).
  const floors = new Box3().setFromObject(root).expandByVector(new Vector3(CEILING_MARGIN, 0, CEILING_MARGIN));
  const planks = findMaterial(root, "T_floor");
  const wood = findMaterial(root, "T_wood") ?? planks;
  if (planks) {
    const { min, max } = floors;
    const ceiling = new Mesh(
      box([min.x, CEILING_HEIGHT, min.z], [max.x, CEILING_HEIGHT + CEILING_THICKNESS, max.z], { tile: STONE_TILE }),
      planks,
    );
    ceiling.receiveShadow = true;
    shell.add(ceiling);
    if (wood) {
      for (let z = min.z + BEAM_SPACING / 2; z < max.z; z += BEAM_SPACING) {
        const beam = new Mesh(
          box([min.x, CEILING_HEIGHT - BEAM_DEPTH, z - BEAM_WIDTH / 2], [max.x, CEILING_HEIGHT, z + BEAM_WIDTH / 2]),
          wood,
        );
        beam.receiveShadow = true;
        shell.add(beam);
      }
    }
  }
  shell.traverse((object) => (object.castShadow = false));
  addCloseViewPart(shell);
  return shell;
}

/** A wall, among the colliders: long and thin. Tables, barrels and the like aren't. */
export function isWall(rect: Rect): boolean {
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  return Math.min(w, d) <= 0.5 && Math.max(w, d) >= 0.8;
}

function findMaterial(root: Object3D, name: string): Material | null {
  let found: Material | null = null;
  root.traverse((object) => {
    if (found || !(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    found = materials.find((material: Material) => material.name === name) ?? null;
  });
  return found;
}

/**
 * How far along the ground from (x, z) towards (x + dx, z + dz) the camera can go before a wall, as a fraction 0 to 1.
 * Walls are the long thin colliders; tables, barrels and the like don't stop it.
 */
export function wallClearance(colliders: readonly Rect[], x: number, z: number, dx: number, dz: number): number {
  let nearest = 1;
  for (const rect of colliders) {
    if (!isWall(rect)) continue;
    // Slab test of the segment against the rectangle.
    let t0 = 0;
    let t1 = nearest;
    for (const [p, v, lo, hi] of [[x, dx, rect.minX, rect.maxX], [z, dz, rect.minZ, rect.maxZ]] as const) {
      if (Math.abs(v) < 1e-9) {
        if (p < lo || p > hi) t0 = Infinity;
        continue;
      }
      let a = (lo - p) / v;
      let b = (hi - p) / v;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
    }
    // Starting inside a wall (she's brushing it) doesn't count.
    if (t0 <= t1 && t0 > 0 && t0 < nearest) nearest = t0;
  }
  return nearest;
}
