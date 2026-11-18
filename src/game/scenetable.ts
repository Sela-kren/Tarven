/**
 * The taproom table under her in a table scene (sexpose.ts `table`, KP's waitress_table): a plain plank top on four
 * legs, built from boxes, the same in the game's picture and the pose preview.
 */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { SceneProp, SceneTable } from "./sexpose";

const TOP_THICK = 0.05;
const LEG = 0.07;
const WOOD = new MeshStandardMaterial({ color: 0x7a5232, roughness: 0.85 });

/** A table, its top at the scene's height, centred where the scene says; `scale` is the bodies'. Named for the preview. */
export function makeTable(table: SceneTable, scale = 1): Group {
  const group = new Group();
  group.name = "Table_Wood";
  const top = new Mesh(new BoxGeometry(table.length, TOP_THICK, table.width), WOOD);
  top.position.set(0, table.height - TOP_THICK / 2, 0);
  group.add(top);
  const legHeight = table.height - TOP_THICK;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new Mesh(new BoxGeometry(LEG, legHeight, LEG), WOOD);
      leg.position.set(sx * (table.length / 2 - LEG), legHeight / 2, sz * (table.width / 2 - LEG));
      group.add(leg);
    }
  }
  group.position.set(table.x * scale, 0, table.z * scale);
  group.scale.setScalar(scale);
  return group;
}

const PLASTER = new MeshStandardMaterial({ color: 0xb9a68a, roughness: 0.95 });

/**
 * A scene's other props (sexpose.ts `props`): a post, a wall, a bench, the bar counter. Each is its box, standing on
 * the floor at the scene's place; a bench and the bar are a plank top on legs, like the table. Named for the preview.
 */
export function makeProps(props: readonly SceneProp[], scale = 1): Group[] {
  return props.map((prop) => {
    if (prop.kind === "bench" || prop.kind === "bar") {
      const group = makeTable({ x: prop.x, z: prop.z, length: prop.length, width: prop.width, height: prop.height }, scale);
      group.rotation.y = prop.turn ?? 0;
      return group;
    }
    const group = new Group();
    group.name = "Table_Wood";
    const box = new Mesh(new BoxGeometry(prop.length, prop.height, prop.width), prop.kind === "wall" ? PLASTER : WOOD);
    box.position.set(0, prop.height / 2, 0);
    group.add(box);
    group.position.set(prop.x * scale, 0, prop.z * scale);
    group.rotation.y = prop.turn ?? 0;
    group.scale.setScalar(scale);
    return group;
  });
}
