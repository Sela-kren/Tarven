/**
 * The taproom table under her in a table scene (sexpose.ts `table`, KP's waitress_table): a plain plank top on four
 * legs, built from boxes, the same in the game's picture and the pose preview.
 */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { SceneTable } from "./sexpose";

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
