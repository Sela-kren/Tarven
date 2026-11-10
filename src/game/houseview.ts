/**
 * Draws the changeable parts of the building: bought floor, the walls around it, and the furniture.
 *
 * Moving furniture is the rare case and drawing it is every frame, so like the rest of the room it is merged
 * into one mesh per material and only rebuilt when the layout changes.
 */
import { BufferGeometry, Group, Material, Matrix4, Mesh, Object3D, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, roomMaterials } from "./furnishings";
import type { FurnitureKind, HousePlan, Placed, WallPiece } from "./house";
import { tessellateForRetro, type World } from "./world";

/** The objects in world.glb that make up one of each piece of furniture. The first is its middle. */
const TEMPLATE_PARTS: Record<FurnitureKind, string[]> = {
  chair: ["Chair_A_S"],
  stool: ["Stool_C1"],
  longTable: ["Table_A", "Plate_A", "Mug_A", "Candle_A"],
  roundTable: ["Table_C", "Candle_C", "Mug_C"],
};
const FURNITURE_OBJECT = /^(Chair|Stool|Table)_/;
const TABLE_DECORATION = /^(Plate|Mug|Candle)_(A|B|C)$/;
/** The walls the plan draws itself, because new floor can open them. */
const PLANNED_WALLS = ["Wall_W", "Wall_S"];
const CANDLE_LIGHTS = ["Light_Candle_A", "Light_Candle_B", "Light_Candle_C"];
/** Where a table's candle flame is above the floor, for its light. */
const CANDLE_LIGHT_HEIGHT = 1.34;
const FLOOR_THICKNESS = 0.2;
const STONE_TILE = 0.5;

const TEMPLATE_NAMES = Object.values(TEMPLATE_PARTS).flat();
const UP = new Vector3(0, 1, 0);

function kindOf(name: string): FurnitureKind {
  if (name.startsWith("Chair_")) return "chair";
  if (name.startsWith("Stool_")) return "stool";
  return name === "Table_C" ? "roundTable" : "longTable";
}

function quarterTurns(object: Object3D): number {
  const forward = new Vector3(0, 0, -1).applyQuaternion(object.getWorldQuaternion(new Quaternion()));
  const turn = Math.round(Math.atan2(-forward.x, -forward.z) / (Math.PI / 2));
  return ((turn % 4) + 4) % 4;
}

/**
 * Takes the movable furniture and the walls the plan owns out of the loaded room, before the room is set up.
 * Returns where the furniture stood, and the objects to keep whole as patterns for it.
 */
export function claimFurniture(root: Object3D): { defaults: Placed[]; whole: string[] } {
  root.updateMatrixWorld(true);
  const defaults: Placed[] = [];
  const claimed: Object3D[] = [];
  root.traverse((object) => {
    if (FURNITURE_OBJECT.test(object.name) && object.userData.collide) {
      const { x, z } = object.getWorldPosition(new Vector3());
      defaults.push({ kind: kindOf(object.name), x, z, turn: quarterTurns(object) });
      claimed.push(object);
    } else if (TABLE_DECORATION.test(object.name) || PLANNED_WALLS.includes(object.name)) {
      claimed.push(object);
    }
  });
  for (const object of claimed) {
    delete object.userData.collide;
    if (!TEMPLATE_NAMES.includes(object.name)) object.removeFromParent();
  }
  return { defaults, whole: TEMPLATE_NAMES };
}

interface TemplatePart {
  geometry: BufferGeometry;
  material: Material;
  castShadow: boolean;
}

interface Bucket {
  material: Material;
  castShadow: boolean;
  geometries: BufferGeometry[];
}

export class HouseView {
  private readonly group = new Group();
  private readonly templates = {} as Record<FurnitureKind, TemplatePart[]>;
  private readonly candleLights: Object3D[];
  private readonly stone: Material;
  private readonly floor: Material;
  private meshes: Mesh[] = [];

  constructor(world: World) {
    const { root, pieces } = world;
    this.group.name = "House";
    root.add(this.group);
    const m = roomMaterials(root);
    this.stone = m("T_stone");
    this.floor = m("T_floor");
    this.candleLights = CANDLE_LIGHTS.flatMap((name) => root.getObjectByName(name) ?? []);

    root.updateMatrixWorld(true);
    for (const [kind, names] of Object.entries(TEMPLATE_PARTS) as [FurnitureKind, string[]][]) {
      const anchor = pieces.get(names[0])?.getWorldPosition(new Vector3());
      if (!anchor) throw new Error(`The room did not keep "${names[0]}" whole`);
      const toLocal = new Matrix4().makeTranslation(-anchor.x, 0, -anchor.z);
      const parts: TemplatePart[] = [];
      for (const name of names) {
        const piece = pieces.get(name);
        if (!piece) throw new Error(`The room did not keep "${name}" whole`);
        piece.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          parts.push({
            geometry: object.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(toLocal, object.matrixWorld)),
            material: object.material as Material,
            castShadow: object.castShadow,
          });
        });
        piece.removeFromParent();
      }
      this.templates[kind] = parts;
    }
  }

  /** Redraws everything from the plan. */
  rebuild(plan: HousePlan): void {
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    this.meshes = [];

    const buckets = new Map<string, Bucket>();
    const add = (material: Material, castShadow: boolean, geometry: BufferGeometry) => {
      const key = `${material.uuid}:${castShadow}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material, castShadow, geometries: [] };
        buckets.set(key, bucket);
      }
      bucket.geometries.push(geometry);
    };

    for (const [col, row] of plan.layout.tiles) {
      const tile = box([col, -FLOOR_THICKNESS, row], [col + 1, 0, row + 1], { tile: STONE_TILE });
      add(this.floor, false, tessellateForRetro(tile));
    }
    const addWall = ({ rect, height }: WallPiece) => {
      const wall = box([rect.minX, 0, rect.minZ], [rect.maxX, height, rect.maxZ], { tile: STONE_TILE });
      add(this.stone, true, tessellateForRetro(wall));
    };
    plan.outerWalls().forEach(addWall);
    plan.drawnWalls().forEach(addWall);

    const placement = new Matrix4();
    const turn = new Quaternion();
    const one = new Vector3(1, 1, 1);
    for (const item of plan.layout.furniture) {
      placement.compose(new Vector3(item.x, 0, item.z), turn.setFromAxisAngle(UP, (item.turn * Math.PI) / 2), one);
      for (const part of this.templates[item.kind]) {
        add(part.material, part.castShadow, part.geometry.clone().applyMatrix4(placement));
      }
    }

    for (const { material, castShadow, geometries } of buckets.values()) {
      const merged = mergeGeometries(geometries);
      if (!merged) throw new Error(`Could not merge the house's ${material.name}`);
      geometries.forEach((geometry) => geometry.dispose());
      const mesh = new Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.meshes.push(mesh);
    }

    // There are only so many candle lights to go round; the first tables get them.
    const tables = plan.layout.furniture.filter((item) => item.kind === "longTable" || item.kind === "roundTable");
    this.candleLights.forEach((light, index) => {
      const table = tables[index];
      light.visible = Boolean(table);
      if (table) light.position.set(table.x, CANDLE_LIGHT_HEIGHT, table.z);
    });
  }

  /** A loose copy of a piece, to carry around while placing it. */
  makeGhost(kind: FurnitureKind): Object3D {
    const ghost = new Group();
    for (const part of this.templates[kind]) {
      ghost.add(new Mesh(part.geometry, part.material));
    }
    return ghost;
  }
}
