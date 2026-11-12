/**
 * Parts of the tavern built in code rather than in Blender: the service bell on the bar and the
 * bedroom through the east wall. They use the room's own materials, so they look like the rest of it,
 * and are added before the room is set up, so they are merged, lit and collided with like everything else.
 *
 * Positions are in game space: +X east, -Z north (the window wall), Y up.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import type { Rect } from "./collision";

/** Where the bell sits on the bar top. */
export const BELL_SPOT = new Vector3(4.95, 1.1, -2.72);
/** The middle of the bed, which the player stands beside to sleep. */
export const BED_SPOT = new Vector3(10.17, 0, -1.35);
/** The player counts as in the bedroom once past this line, and the camera moves to look at it. */
export const BEDROOM_FROM_X = 7.25;
/** Where the camera looks while the player is in the bedroom. */
export const BEDROOM_VIEW = new Vector3(8.6, 0.8, 0);
/** South of here is a bought wing, even if it's as far east as the bedroom. */
export const BEDROOM_SOUTH_Z = 3;
/** The bed is left as its own object so it can be outlined. */
export const BED_NAME = "Bed";
/** The bedroom door, left as its own object so it can swing. Its origin is the hinge. */
export const BEDROOM_DOOR_NAME = "Bedroom_Door";
/** The middle of the doorway, where the player opens and closes the door. */
export const BEDROOM_DOOR_SPOT = new Vector3(7.2, 0, 0);
/** How far the door turns to open, swinging into the bedroom so it lies against the south side. */
export const BEDROOM_DOOR_OPEN_ANGLE = -Math.PI / 2;
/** What the door blocks when shut, and when open. */
export const BEDROOM_DOOR_SHUT: Rect = { minX: 7.0, maxX: 7.4, minZ: -0.6, maxZ: 0.6 };
export const BEDROOM_DOOR_OPEN: Rect = { minX: 7.4, maxX: 8.38, minZ: 0.55, maxZ: 0.66 };

/** The drafting desk, kept whole so it can be outlined. */
export const DESK_NAME = "Drafting_Desk";
/** The middle of the desk, which the player stands near to open the plans. */
export const DESK_SPOT = new Vector3(10.15, 0, 1.82);
/** Your journal, lying on the chest at the foot of the bed: read it to see how you stand. */
export const JOURNAL_NAME = "Journal";
export const JOURNAL_SPOT = new Vector3(10.08, 0, 0.08);
/** Her bath, under the window of her own bathroom east of the bedroom, kept whole so it can be outlined. */
export const BATH_NAME = "Bath";
/** The middle of the bath, which she stands beside to wash. */
export const BATH_SPOT = new Vector3(12.35, 0, -1.95);
/** Past this line she is in the bathroom, and the camera moves over to look at it. */
export const BATHROOM_FROM_X = 11.0;
/** Where the camera looks while she is in the bathroom. */
export const BATHROOM_VIEW = new Vector3(12.4, 0.8, 0);
/** Where the doorway from the bedroom runs, north to south, between the chest and the desk. */
const BATHROOM_DOOR_Z: [number, number] = [0.45, 1.25];

const WALL_HEIGHT = 3.2;
const WALL = 0.4;
/** The tavern's east wall, which the bedroom doorway is cut through. */
const EAST_WALL_X = 7.0;
const TAVERN_HALF_DEPTH = 5;
/** South of here the east wall belongs to the building plan, since new floor can open it. */
const EAST_WALL_PLANNED_FROM_Z = 3;
/** Inside of the bedroom. */
const ROOM = { minX: EAST_WALL_X + WALL, maxX: 10.8, minZ: -2.4, maxZ: 2.4 };
const DOOR_HALF_WIDTH = 0.6;
const DOOR_HEIGHT = 2.3;
/** The south wall is a low sill, like the tavern's, so it never hides the player. */
const SILL_HEIGHT = 0.35;

const BELL_SCALE = 1.8;

const COLORS = {
  linen: 0xd9cfb6,
  wool: 0x7a2c22,
  brass: 0xc29235,
};

/** Each face gets texture coordinates from its own size, so a texture tiles at the same scale everywhere. */
interface Surface {
  /** Repeats of the texture per metre. */
  tile?: number;
  /** Stretch the whole texture once across each face instead, for pictures like the rug and window. */
  fit?: boolean;
  /** Turn the texture a quarter, so planks run upright on posts. */
  swap?: boolean;
}

/** A box from one corner to the other. */
export function box(min: [number, number, number], max: [number, number, number], surface: Surface = {}): BufferGeometry {
  const size = new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const geometry = new BoxGeometry(size.x, size.y, size.z);
  geometry.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);

  const { tile = 1, fit = false, swap = false } = surface;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const local = (axis: 0 | 1 | 2, value: number) => (fit ? (value - min[axis]) / size.getComponent(axis) : value * tile);
  for (let i = 0; i < position.count; i++) {
    const [x, y, z] = [local(0, position.getX(i)), local(1, position.getY(i)), local(2, position.getZ(i))];
    const [nx, ny, nz] = [Math.abs(normal.getX(i)), Math.abs(normal.getY(i)), Math.abs(normal.getZ(i))];
    let [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y];
    if (swap) [u, v] = [v, u];
    uv.setXY(i, u, v);
  }
  return geometry;
}

/** One named object of the room, made of shapes that may use different materials. */
class Piece {
  readonly group = new Group();

  constructor(name: string, collide = false) {
    this.group.name = name;
    if (collide) this.group.userData.collide = 1;
  }

  add(geometry: BufferGeometry, material: Material): this {
    const mesh = new Mesh(geometry, material);
    mesh.name = `${this.group.name}_${this.group.children.length}`;
    this.group.add(mesh);
    return this;
  }

  into(parent: Object3D): Object3D {
    parent.add(this.group);
    return this.group;
  }
}

function flat(name: string, color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color, roughness: 0.95 });
}

/** The materials already in the room, by name. */
export function roomMaterials(root: Object3D): (name: string) => Material {
  const found = new Map<string, Material>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      found.set(material.name, material);
    }
  });
  return (name) => {
    const material = found.get(name);
    if (!material) throw new Error(`world.glb has no material "${name}"`);
    return material;
  };
}

/** A candle in a dish, with the anchor its light is hung from. */
function candle(root: Object3D, name: string, at: Vector3, m: (name: string) => Material): void {
  const piece = new Piece(name);
  piece.add(new CylinderGeometry(0.07, 0.07, 0.015, 6).translate(at.x, at.y + 0.0075, at.z), m("T_iron"));
  piece.add(new CylinderGeometry(0.03, 0.03, 0.13, 5).translate(at.x, at.y + 0.08, at.z), m("T_wax"));
  piece.add(new ConeGeometry(0.024, 0.09, 4).translate(at.x, at.y + 0.19, at.z), m("T_flame"));
  piece.into(root);

  const light = new Object3D();
  light.name = `Light_${name}`;
  light.position.set(at.x, at.y + 0.55, at.z);
  light.userData.light = "candle";
  root.add(light);
}

/** Cuts a doorway through the tavern's east wall and builds a small bedroom behind it. */
export function addBedroom(root: Object3D): void {
  const m = roomMaterials(root);
  const linen = flat("T_linen_bed", COLORS.linen);
  const wool = flat("T_wool", COLORS.wool);
  const stone = { tile: 0.5 };

  // The old east wall is one solid block; it comes back as two pieces either side of the doorway.
  root.getObjectByName("Wall_E")?.removeFromParent();
  const [x0, x1] = [EAST_WALL_X, EAST_WALL_X + WALL];
  new Piece("Wall_E_North", true)
    .add(box([x0, 0, -TAVERN_HALF_DEPTH], [x1, WALL_HEIGHT, -DOOR_HALF_WIDTH], stone), m("T_stone"))
    .into(root);
  new Piece("Wall_E_South", true)
    .add(box([x0, 0, DOOR_HALF_WIDTH], [x1, WALL_HEIGHT, EAST_WALL_PLANNED_FROM_Z], stone), m("T_stone"))
    .into(root);
  new Piece("Doorway")
    .add(box([x0, DOOR_HEIGHT, -DOOR_HALF_WIDTH], [x1, WALL_HEIGHT, DOOR_HALF_WIDTH], stone), m("T_stone"))
    .add(box([x0 - 0.05, 0, -0.72], [x1 + 0.05, DOOR_HEIGHT, -DOOR_HALF_WIDTH], { swap: true }), m("T_wood"))
    .add(box([x0 - 0.05, 0, DOOR_HALF_WIDTH], [x1 + 0.05, DOOR_HEIGHT, 0.72], { swap: true }), m("T_wood"))
    .add(box([x0 - 0.05, DOOR_HEIGHT, -0.72], [x1 + 0.05, DOOR_HEIGHT + 0.14, 0.72]), m("T_wood"))
    .into(root);

  // A plank door hung on the south post. Built round its hinge, so turning it swings it open.
  const leaf = 2 * DOOR_HALF_WIDTH - 0.03;
  const door = new Piece(BEDROOM_DOOR_NAME)
    .add(box([-0.04, 0.02, -leaf], [0.04, DOOR_HEIGHT - 0.04, -0.01], { tile: 0.9, swap: true }), m("T_wood"))
    .add(box([-0.06, 0.42, -leaf + 0.06], [0.06, 0.52, -0.06]), m("T_iron"))
    .add(box([-0.06, 1.72, -leaf + 0.06], [0.06, 1.82, -0.06]), m("T_iron"))
    .add(box([-0.09, 1.02, -leaf + 0.08], [0.09, 1.1, -leaf + 0.14]), m("T_iron"))
    .into(root);
  door.position.set(BEDROOM_DOOR_SPOT.x, 0, DOOR_HALF_WIDTH);

  // The room itself.
  const { minX, maxX, minZ, maxZ } = ROOM;
  new Piece("Bedroom_Floor").add(box([x0, -0.2, minZ - WALL], [maxX + WALL, 0, maxZ + WALL], stone), m("T_floor")).into(root);
  new Piece("Bedroom_Wall_N", true)
    .add(box([minX, 0, minZ - WALL], [maxX + WALL, WALL_HEIGHT, minZ], stone), m("T_stone"))
    .into(root);
  // The east wall has a doorway through to the bathroom, between the chest and the desk.
  const [bathDoorMin, bathDoorMax] = BATHROOM_DOOR_Z;
  new Piece("Bedroom_Wall_E_North", true)
    .add(box([maxX, 0, minZ], [maxX + WALL, WALL_HEIGHT, bathDoorMin], stone), m("T_stone"))
    .into(root);
  new Piece("Bedroom_Wall_E_South", true)
    .add(box([maxX, 0, bathDoorMax], [maxX + WALL, WALL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
    .into(root);
  new Piece("Bathroom_Doorway")
    .add(box([maxX, DOOR_HEIGHT, bathDoorMin], [maxX + WALL, WALL_HEIGHT, bathDoorMax], stone), m("T_stone"))
    .add(box([maxX - 0.05, 0, bathDoorMin - 0.12], [maxX + WALL + 0.05, DOOR_HEIGHT, bathDoorMin], { swap: true }), m("T_wood"))
    .add(box([maxX - 0.05, 0, bathDoorMax], [maxX + WALL + 0.05, DOOR_HEIGHT, bathDoorMax + 0.12], { swap: true }), m("T_wood"))
    .add(box([maxX - 0.05, DOOR_HEIGHT, bathDoorMin - 0.12], [maxX + WALL + 0.05, DOOR_HEIGHT + 0.14, bathDoorMax + 0.12]), m("T_wood"))
    .into(root);
  new Piece("Bedroom_Wall_S", true)
    .add(box([minX, 0, maxZ], [maxX, SILL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
    .into(root);
  new Piece("Bedroom_Beams")
    .add(box([minX, WALL_HEIGHT - 0.28, minZ], [maxX, WALL_HEIGHT, minZ + 0.2]), m("T_wood"))
    .add(box([maxX - 0.16, 0, minZ], [maxX, WALL_HEIGHT, minZ + 0.26], { swap: true }), m("T_wood"))
    .into(root);

  new Piece("Bedroom_Window")
    .add(box([7.65, 1.15, minZ - 0.02], [8.75, 2.45, minZ + 0.02], { fit: true }), m("T_window"))
    .add(box([7.55, 2.45, minZ - 0.06], [8.85, 2.57, minZ + 0.08]), m("T_wood"))
    .add(box([7.55, 1.03, minZ - 0.06], [8.85, 1.15, minZ + 0.12]), m("T_wood"))
    .into(root);
  new Piece("Bedroom_Rug").add(box([7.9, 0, -1.2], [9.3, 0.02, 1.4], { fit: true }), m("T_rug")).into(root);

  // The bed, head against the north wall, with a red wool blanket over the lower half.
  new Piece(BED_NAME, true)
    .add(box([9.55, 0, -2.4], [10.8, 1.05, -2.3], { tile: 0.8 }), m("T_wood"))
    .add(box([9.55, 0, -0.38], [10.8, 0.62, -0.3], { tile: 0.8 }), m("T_wood"))
    .add(box([9.6, 0.1, -2.3], [10.75, 0.35, -0.38], { tile: 0.8 }), m("T_wood"))
    .add(box([9.63, 0.35, -2.3], [10.72, 0.5, -0.38]), linen)
    .add(box([9.78, 0.5, -2.25], [10.57, 0.63, -1.88]), linen)
    .add(box([9.58, 0.3, -1.72], [10.77, 0.56, -0.4]), wool)
    .into(root);

  new Piece("Bedroom_Nightstand", true)
    .add(box([8.95, 0, -2.38], [9.4, 0.55, -1.95], { tile: 0.9 }), m("T_crate"))
    .add(box([8.92, 0.55, -2.4], [9.43, 0.6, -1.92]), m("T_tabletop"))
    .into(root);
  candle(root, "Candle_Bedside", new Vector3(9.18, 0.6, -2.16), m);

  new Piece("Bedroom_Chest", true)
    .add(box([9.75, 0, -0.18], [10.6, 0.46, 0.34], { tile: 0.9 }), m("T_crate"))
    .add(box([9.72, 0.46, -0.2], [10.63, 0.53, 0.36]), m("T_wood"))
    .add(box([9.88, 0, -0.21], [9.94, 0.54, 0.37]), m("T_iron"))
    .add(box([10.41, 0, -0.21], [10.47, 0.54, 0.37]), m("T_iron"))
    .into(root);
  candle(root, "Candle_Chest", new Vector3(10.45, 0.53, 0.1), m);

  // The journal on the chest: a red leather cover, cream pages showing on three sides, and a gold ribbon.
  const leather = flat("T_journal", 0x7a2418);
  new Piece(JOURNAL_NAME)
    .add(box([9.88, 0.53, -0.07], [10.26, 0.542, 0.21]), leather)
    .add(box([9.895, 0.542, -0.06], [10.25, 0.568, 0.2]), flat("T_pages", 0xe8dcb8))
    .add(box([9.88, 0.568, -0.07], [10.26, 0.58, 0.21]), leather)
    .add(box([9.875, 0.53, -0.07], [9.895, 0.58, 0.21]), leather)
    .add(box([10.12, 0.47, 0.205], [10.15, 0.575, 0.215]), flat("T_ribbon", 0xd9a93a))
    .into(root);

  // The drafting desk in the south-east corner, with the plans for the house spread out on it.
  const plans = new MeshStandardMaterial({ name: "T_blueprint", map: blueprintTexture(), roughness: 0.95 });
  const desk = new Piece(DESK_NAME, true)
    .add(box([9.5, 0.74, 1.32], [10.8, 0.8, 2.34], { tile: 0.7 }), m("T_tabletop"))
    .add(box([9.72, 0.8, 1.45], [10.62, 0.812, 2.2], { fit: true }), plans);
  for (const [x, z] of [[9.56, 1.38], [10.68, 1.38], [9.56, 2.22], [10.68, 2.22]]) {
    desk.add(box([x, 0, z], [x + 0.08, 0.74, z + 0.08], { swap: true }), m("T_wood"));
  }
  const roll = (z: number) => new CylinderGeometry(0.035, 0.035, 0.62, 6).rotateZ(Math.PI / 2).translate(10.16, 0.84, z);
  desk.add(roll(1.39), linen).add(roll(1.34), plans);
  desk.add(new CylinderGeometry(0.05, 0.06, 0.09, 6).translate(9.62, 0.85, 2.2), m("T_iron"));
  desk.into(root);

  addBathroom(root, m, linen);
}

/** Turns a shape's texture a quarter and stretches it, so planks run up a turned shape like staves. */
function staveUv(geometry: BufferGeometry, around: number, up: number): BufferGeometry {
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * up, uv.getX(i) * around);
  return geometry;
}

/** How much longer the bath is east to west than it is wide. */
const BATH_STRETCH = 1.85;
/** The tub's side, bottom to top: out and up the staves, over the rim, and back down inside to its floor. */
const BATH_PROFILE: [number, number][] = [
  [0, 0], [0.33, 0], [0.38, 0.56], [0.395, 0.6], [0.355, 0.6], [0.31, 0.07], [0, 0.07],
];
/** How high the water stands inside, well under the rim so the inside of the tub shows. */
const BATH_WATER = 0.43;

/** Inside of the bathroom, through the bedroom's east wall. */
const BATHROOM = { minX: ROOM.maxX + WALL, maxX: 13.6, minZ: ROOM.minZ, maxZ: ROOM.maxZ };

/**
 * Her own bathroom, through a curtained doorway in the bedroom's east wall. Flagstones underfoot, and under the
 * window a deep oval tub of iron-hooped staves full of hot water, with a bucket and ladle beside it. A brick stove
 * in the corner keeps a copper of water hot; there is a washstand and mirror on the east wall, a bench along the
 * sill with folded towels, and pegs and a shelf by the door. Only the tub and bucket are the outlined, solid bath.
 */
function addBathroom(root: Object3D, m: (name: string) => Material, towel: Material): void {
  const stone = { tile: 0.5 };
  const { minX, maxX, minZ, maxZ } = BATHROOM;

  const flags = new MeshStandardMaterial({ name: "T_flagstones", map: flagstoneTexture(), roughness: 0.95 });
  new Piece("Bathroom_Floor").add(box([minX, -0.2, minZ - WALL], [maxX + WALL, 0, maxZ + WALL], { tile: 0.4 }), flags).into(root);
  new Piece("Bathroom_Wall_N", true)
    .add(box([minX, 0, minZ - WALL], [maxX + WALL, WALL_HEIGHT, minZ], stone), m("T_stone"))
    .into(root);
  new Piece("Bathroom_Wall_E", true)
    .add(box([maxX, 0, minZ], [maxX + WALL, WALL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
    .into(root);
  new Piece("Bathroom_Wall_S", true)
    .add(box([minX, 0, maxZ], [maxX, SILL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
    .into(root);
  new Piece("Bathroom_Beams")
    .add(box([minX, WALL_HEIGHT - 0.28, minZ], [maxX, WALL_HEIGHT, minZ + 0.2]), m("T_wood"))
    .add(box([maxX - 0.16, 0, minZ], [maxX, WALL_HEIGHT, minZ + 0.26], { swap: true }), m("T_wood"))
    .into(root);
  new Piece("Bathroom_Window")
    .add(box([11.8, 1.15, minZ - 0.02], [12.9, 2.45, minZ + 0.02], { fit: true }), m("T_window"))
    .add(box([11.7, 2.45, minZ - 0.06], [13.0, 2.57, minZ + 0.08]), m("T_wood"))
    .add(box([11.7, 1.03, minZ - 0.06], [13.0, 1.15, minZ + 0.12]), m("T_wood"))
    .into(root);

  root.add(addTub(m, towel));
  addBathroomFittings(root, m, towel);
}

/** The bath itself: the tub, the water and what lies on it, and the bucket beside it. */
function addTub(m: (name: string) => Material, towel: Material): Object3D {
  const water = flat("T_bathwater", 0x2c5a63);
  const suds = flat("T_bathsuds", 0xdcdcd2);
  const soap = flat("T_soap", 0xe9dcae);
  const { x, z } = BATH_SPOT;
  const oval = (geometry: BufferGeometry, y = 0) => geometry.scale(BATH_STRETCH, 1, 1).translate(x, y, z);
  const rim = BATH_PROFILE[3][1];

  const bath = new Piece(BATH_NAME, true)
    .add(oval(staveUv(turned(BATH_PROFILE, 16), 3.4, 1.4)), m("T_wood"))
    .add(oval(new CylinderGeometry(0.338, 0.338, 0.01, 16), BATH_WATER), water);
  // Iron hoops, low and high, following the flare of the staves.
  for (const [y, r] of [[0.1, 0.342], [0.44, 0.372]]) {
    bath.add(oval(new CylinderGeometry(r + 0.012, r + 0.01, 0.05, 16, 1, true), y), m("T_iron"));
  }
  // Little clusters of suds drifting at the edges of the water, and a cake of soap on the west end of the rim.
  const foam: [number, number, number][] = [
    [-0.42, 0.1, 0.035], [-0.37, 0.15, 0.025], [-0.47, 0.05, 0.02],
    [0.38, -0.14, 0.03], [0.43, -0.1, 0.022],
    [0.05, -0.24, 0.025], [0.1, -0.22, 0.018],
  ];
  for (const [dx, dz, size] of foam) {
    bath.add(new CylinderGeometry(size, size, 0.015, 6).translate(x + dx, BATH_WATER + 0.008, z + dz), suds);
  }
  const westRim = x - 0.375 * BATH_STRETCH;
  bath.add(box([westRim - 0.04, rim, z - 0.06], [westRim + 0.05, rim + 0.035, z + 0.05]), soap);
  // A towel hung over the middle of the south rim, facing the camera, falling down inside and out.
  const tz = z + 0.37;
  bath
    .add(box([x - 0.17, rim, tz - 0.05], [x + 0.17, rim + 0.02, tz + 0.04]), towel)
    .add(box([x - 0.17, rim - 0.3, tz + 0.025], [x + 0.17, rim + 0.01, tz + 0.045]), towel)
    .add(box([x - 0.17, rim - 0.16, tz - 0.055], [x + 0.17, rim + 0.01, tz - 0.035]), towel);
  // The bucket she fills it from, east of the tub, with a ladle in it.
  const [bx, bz] = [x + 0.395 * BATH_STRETCH + 0.2, z - 0.05];
  bath
    .add(staveUv(turned([[0, 0], [0.12, 0], [0.15, 0.34], [0.13, 0.34], [0.105, 0.03], [0, 0.03]], 10), 0.9, 0.8).translate(bx, 0, bz), m("T_wood"))
    .add(new CylinderGeometry(0.128, 0.128, 0.01, 10).translate(bx, 0.27, bz), water)
    .add(new CylinderGeometry(0.153, 0.15, 0.035, 10, 1, true).translate(bx, 0.25, bz), m("T_iron"))
    .add(new CylinderGeometry(0.012, 0.012, 0.42, 4).rotateZ(-0.5).translate(bx + 0.06, 0.38, bz), m("T_wood"))
    .add(new CylinderGeometry(0.045, 0.035, 0.05, 6).translate(bx - 0.03, 0.28, bz), m("T_iron"));
  return bath.group;
}

/** Everything else in the bathroom. */
function addBathroomFittings(root: Object3D, m: (name: string) => Material, towel: Material): void {
  const { minX, maxX, maxZ } = BATHROOM;
  const copper = flat("T_copper", 0xa8603a);
  const blueTowel = flat("T_towel_blue", 0x5d7590);
  const brick = { tile: 0.7 };

  // A straw mat on the flagstones where she steps out of the tub.
  new Piece("Bath_Mat")
    .add(box([BATH_SPOT.x - 0.35, 0, -1.5], [BATH_SPOT.x + 0.35, 0.015, -1.12]), flat("T_straw", 0xb39a5e))
    .into(root);

  // The curtain, drawn back against the wall south of the doorway on a rod across it.
  const [doorMin, doorMax] = BATHROOM_DOOR_Z;
  new Piece("Bathroom_Curtain")
    .add(new CylinderGeometry(0.015, 0.015, doorMax - doorMin + 0.4, 4).rotateX(Math.PI / 2).translate(minX + 0.08, DOOR_HEIGHT - 0.05, (doorMin + doorMax) / 2 + 0.1), m("T_iron"))
    .add(box([minX + 0.01, 0.06, doorMax + 0.02], [minX + 0.13, DOOR_HEIGHT - 0.05, doorMax + 0.24]), flat("T_curtain", 0x6a2a24))
    .add(box([minX + 0.0, 1.0, doorMax + 0.04], [minX + 0.15, 1.06, doorMax + 0.22]), m("T_wood"))
    .into(root);

  // A brick stove in the south-east corner with its fire showing to the west, a copper of water on top, and a
  // flue up the east wall.
  const stove = { minX: 12.95, maxX, minZ: 1.7, maxZ, top: 0.55 };
  const mid = (stove.minZ + stove.maxZ) / 2;
  new Piece("Bath_Stove", true)
    .add(box([stove.minX, 0, stove.minZ], [stove.maxX, stove.top, stove.maxZ], brick), m("T_hearth"))
    .add(box([stove.minX - 0.01, 0.08, mid - 0.16], [stove.minX, 0.32, mid + 0.16]), m("T_soot"))
    .add(box([stove.minX - 0.015, 0.1, mid - 0.12], [stove.minX - 0.005, 0.17, mid + 0.12]), m("T_flame"))
    .add(box([stove.minX - 0.015, 0.17, mid - 0.05], [stove.minX - 0.005, 0.22, mid + 0.07]), m("T_flame"))
    .add(box([stove.minX - 0.03, 0.06, mid - 0.2], [stove.minX + 0.01, 0.08, mid + 0.2]), m("T_iron"))
    .add(new CylinderGeometry(0.06, 0.06, 0.75, 6).translate(13.47, stove.top + 0.375, mid), m("T_iron"))
    .add(new CylinderGeometry(0.06, 0.06, 0.2, 6).rotateZ(Math.PI / 2).translate(13.5, stove.top + 0.75, mid), m("T_iron"))
    .add(turned([[0.18, 0], [0.22, 0.08], [0.23, 0.2], [0.21, 0.28], [0.19, 0.3], [0.17, 0.3], [0, 0.29]], 10).translate(13.17, stove.top, mid), copper)
    .add(new CylinderGeometry(0.012, 0.012, 0.36, 4).rotateX(Math.PI / 2).translate(13.17, stove.top + 0.36, mid), m("T_iron"))
    .into(root);
  const glow = new Object3D();
  glow.name = "Light_Bath_Stove";
  glow.position.set(stove.minX - 0.4, 0.4, mid);
  glow.userData.light = "candle";
  root.add(glow);

  // A washstand against the east wall, with a basin and jug, and a small mirror over it.
  const stand = new Piece("Bath_Washstand", true)
    .add(box([13.12, 0.78, -0.35], [maxX, 0.83, 0.45], { tile: 0.8 }), m("T_tabletop"))
    .add(box([13.16, 0.18, -0.31], [maxX, 0.22, 0.41], { tile: 0.8 }), m("T_wood"));
  for (const [x, z] of [[13.14, -0.33], [13.14, 0.37]]) {
    stand.add(box([x, 0, z], [x + 0.06, 0.78, z + 0.06], { swap: true }), m("T_wood"));
  }
  stand
    .add(turned([[0.07, 0], [0.13, 0.04], [0.17, 0.1], [0.155, 0.1], [0.11, 0.045], [0, 0.03]], 10).translate(13.36, 0.83, 0.02), flat("T_basin", 0xd8d2c0))
    .add(turned([[0.06, 0], [0.075, 0.08], [0.05, 0.18], [0.04, 0.22], [0.055, 0.26], [0, 0.26]], 8).translate(13.4, 0.83, 0.32), copper)
    .add(box([maxX - 0.02, 1.18, -0.16], [maxX, 1.8, 0.26]), m("T_wood"))
    .add(box([maxX - 0.03, 1.23, -0.11], [maxX - 0.02, 1.75, 0.21]), flat("T_mirror", 0xaab8bc))
    .into(root);

  // A bench along the south sill, with towels folded on it and a sponge.
  const bench = new Piece("Bath_Bench", true)
    .add(box([11.45, 0.4, 1.98], [12.65, 0.46, 2.34], { tile: 0.8 }), m("T_tabletop"));
  for (const x of [11.52, 12.52]) bench.add(box([x, 0, 2.0], [x + 0.06, 0.4, 2.32], { swap: true }), m("T_wood"));
  bench
    .add(box([11.6, 0.46, 2.04], [11.95, 0.52, 2.3]), towel)
    .add(box([11.62, 0.52, 2.05], [11.93, 0.58, 2.29]), towel)
    .add(box([11.64, 0.58, 2.06], [11.91, 0.63, 2.28]), blueTowel)
    .add(new CylinderGeometry(0.06, 0.07, 0.07, 6).scale(1.3, 1, 1).translate(12.3, 0.495, 2.16), flat("T_sponge", 0xc9a85a))
    .into(root);

  // By the door: pegs with a hanging towel and a scrubbing brush, and over them a shelf of oils with a candle.
  const wall = minX;
  const pegs = new Piece("Bath_Pegs")
    .add(box([wall, 1.42, -1.45], [wall + 0.04, 1.5, -0.55]), m("T_wood"))
    .add(box([wall, 1.0, -0.42], [wall + 0.24, 1.04, 0.1]), m("T_tabletop"))
    .add(box([wall, 0.84, -0.38], [wall + 0.03, 1.0, -0.34], { swap: true }), m("T_wood"))
    .add(box([wall, 0.84, 0.03], [wall + 0.03, 1.0, 0.07], { swap: true }), m("T_wood"));
  for (const pz of [-1.33, -1.0, -0.7]) {
    pegs.add(new CylinderGeometry(0.014, 0.014, 0.1, 4).rotateZ(Math.PI / 2).translate(wall + 0.08, 1.46, pz), m("T_wood"));
  }
  pegs
    .add(box([wall + 0.06, 0.82, -1.44], [wall + 0.1, 1.48, -1.2]), towel)
    .add(box([wall + 0.06, 0.95, -1.12], [wall + 0.1, 1.48, -0.88]), blueTowel)
    .add(box([wall + 0.07, 1.25, -0.72], [wall + 0.09, 1.45, -0.68]), m("T_wood"))
    .add(box([wall + 0.05, 1.13, -0.75], [wall + 0.11, 1.26, -0.65]), m("T_crate"))
    .add(turned([[0.04, 0], [0.042, 0.12], [0.016, 0.16], [0.014, 0.21], [0, 0.21]], 7).translate(wall + 0.12, 1.04, -0.08), flat("T_oil_green", 0x3d6b3a))
    .add(turned([[0.05, 0], [0.052, 0.07], [0.02, 0.1], [0.018, 0.13], [0, 0.13]], 7).translate(wall + 0.13, 1.04, 0.03), flat("T_oil_brown", 0x6b3f1f))
    .into(root);
  candle(root, "Candle_Bath", new Vector3(wall + 0.14, 1.04, -0.3), m);
}

/** Big square-cut flagstones in a few greys, laid in staggered rows with dark joints. Tiles seamlessly. */
function flagstoneTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("No 2D canvas for the flagstones");
  g.fillStyle = "#3b3833";
  g.fillRect(0, 0, size, size);
  const greys = ["#77736a", "#6c685f", "#817c71", "#706b63", "#7b766c", "#66625a"];
  const row = size / 3;
  let n = 0;
  for (let r = 0; r < 3; r++) {
    // Each row is laid in slabs of uneven length, shifted so the joints don't line up.
    const widths = [[48, 44, 36], [40, 52, 36], [56, 32, 40]][r];
    let x = [0, 22, 10][r];
    for (let i = 0; i < 4; i++) {
      const w = widths[i % 3];
      g.fillStyle = greys[n++ % greys.length];
      // Drawn twice, so a slab running off the right edge comes back in on the left.
      for (const shift of [0, -size]) g.fillRect(x + shift + 2, r * row + 2, w - 4, row - 4);
      x += w;
    }
  }
  // A little speckle so the slabs read as stone.
  for (let i = 0; i < 500; i++) {
    g.fillStyle = (i * 7919) % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    g.fillRect((i * 37) % size, (i * 91) % size, 2, 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** A blue sheet with a white grid and the outline of a floor plan on it. */
function blueprintTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("No 2D canvas for the blueprint");
  g.fillStyle = "#17477f";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#3f77b4";
  for (let at = 8; at < size; at += 16) {
    g.fillRect(at, 0, 1, size);
    g.fillRect(0, at, size, 1);
  }
  g.strokeStyle = "#e4eefa";
  g.lineWidth = 3;
  g.strokeRect(20, 28, 88, 72);
  g.beginPath();
  g.moveTo(66, 28);
  g.lineTo(66, 62);
  g.moveTo(66, 78);
  g.lineTo(66, 100);
  g.moveTo(20, 66);
  g.lineTo(48, 66);
  g.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** The front door, left as its own object so it can swing. */
export const FRONT_DOOR_NAME = "Door";
/** The door's hinge, on its east side, so it opens away from the tables. */
export const FRONT_DOOR_HINGE = new Vector3(-0.85, 0, -4.97);
/** How far the door turns to open, swinging into the room where the camera can see it. */
export const FRONT_DOOR_OPEN_ANGLE = Math.PI / 2;

/**
 * The dark seen through the open front door. The door hangs on a solid wall, so this panel stands in for
 * the hole: it sits behind the shut door, and anyone walking out passes behind it and is gone.
 */
export function addFrontDoorway(root: Object3D): void {
  new Piece("FrontDoorway").add(box([-2.15, 0, -5], [-0.85, 2.25, -4.96]), flat("T_outside", 0x070a12)).into(root);
}

/** The scrap bin, kept whole so it can be outlined. */
export const BIN_NAME = "Bin";
/** Where the bin stands: on the floor by the north wall, between the front door and the bar's back shelf. */
export const BIN_SPOT = new Vector3(0.2, 0, -4.45);

/** A wooden scrap tub with iron hoops, for throwing away whatever you picked up by mistake. */
export function addBin(root: Object3D): void {
  const m = roomMaterials(root);
  const scraps = flat("T_scraps", 0x2a1d12);
  const { x, z } = BIN_SPOT;
  new Piece(BIN_NAME, true)
    .add(new CylinderGeometry(0.27, 0.22, 0.6, 10, 1, true).translate(x, 0.3, z), m("T_wood"))
    .add(new CylinderGeometry(0.22, 0.22, 0.02, 10).translate(x, 0.01, z), m("T_wood"))
    .add(new CylinderGeometry(0.25, 0.25, 0.02, 10).translate(x, 0.48, z), scraps)
    .add(new CylinderGeometry(0.235, 0.235, 0.05, 10, 1, true).translate(x, 0.12, z), m("T_iron"))
    .add(new CylinderGeometry(0.275, 0.275, 0.05, 10, 1, true).translate(x, 0.56, z), m("T_iron"))
    .into(root);
}

/** The wash tub, kept whole so it can be outlined. */
export const WASH_TUB_NAME = "Wash_Tub";
/** Where the tub stands: on the floor past the east end of the bar, just south of the barrels. */
export const WASH_TUB_SPOT = new Vector3(6.4, 0, -2.2);

/** A half-barrel of soapy water, where dirty cups and dishes get scrubbed. */
export function addWashTub(root: Object3D): void {
  const m = roomMaterials(root);
  const water = flat("T_washwater", 0x7f9aa0);
  const suds = flat("T_suds", 0xe8e4d6);
  const { x, z } = WASH_TUB_SPOT;
  const tub = new Piece(WASH_TUB_NAME, true)
    .add(new CylinderGeometry(0.34, 0.28, 0.55, 12, 1, true).translate(x, 0.275, z), m("T_wood"))
    .add(new CylinderGeometry(0.28, 0.28, 0.02, 12).translate(x, 0.01, z), m("T_wood"))
    .add(new CylinderGeometry(0.31, 0.31, 0.02, 12).translate(x, 0.46, z), water)
    .add(new CylinderGeometry(0.295, 0.295, 0.05, 12, 1, true).translate(x, 0.12, z), m("T_iron"))
    .add(new CylinderGeometry(0.345, 0.345, 0.05, 12, 1, true).translate(x, 0.5, z), m("T_iron"));
  for (const [dx, dz, size] of [[-0.12, 0.08, 0.09], [0.1, -0.1, 0.07], [0.05, 0.13, 0.06], [-0.04, -0.03, 0.05]]) {
    tub.add(new CylinderGeometry(size, size, 0.03, 7).translate(x + dx, 0.48, z + dz), suds);
  }
  tub.into(root);
}

/** The crates the bread basket used to sit on, which the bakery corner replaces. */
const BAKERY_REPLACES = ["Crate_0", "Crate_1", "Crate_2"];
/** The bread oven's plinth in the south-west corner, against the west wall. Its top is the oven floor. */
const OVEN = { minX: -7.0, maxX: -5.85, minZ: 3.1, maxZ: 4.95, top: 0.8 };
/** The middle of the dome, and of the mouth that faces into the room. */
const OVEN_MID = { x: -6.42, z: 4.03 };
const OVEN_RADIUS = 0.56;

/** Stretches a shape's texture coordinates, so a texture wrapped round a curve keeps its scale. */
function scaleUv(geometry: BufferGeometry, u: number, v: number): BufferGeometry {
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return geometry;
}

/** A shape turned round the upright axis, from (radius, height) pairs listed bottom to top. */
function turned(profile: [number, number][], sides: number): LatheGeometry {
  return new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), sides);
}

const LOAF: [number, number][] = [[0.07, 0], [0.1, 0.04], [0.06, 0.08], [0.012, 0.095], [0, 0.096]];
const SACK: [number, number][] = [
  [0.2, 0], [0.25, 0.12], [0.26, 0.32], [0.22, 0.48], [0.12, 0.56], [0.06, 0.6], [0.08, 0.66], [0.03, 0.7], [0, 0.7],
];

/**
 * A baker's corner where the crates stood: a domed brick bread oven with its fire showing in the mouth and
 * firewood stacked underneath, the table the bread basket sits on, flour sacks and a peel against the wall.
 * The basket itself stays in props.glb, where it was, so taking bread works as before.
 */
export function addBakery(root: Object3D): void {
  const m = roomMaterials(root);
  for (const name of BAKERY_REPLACES) root.getObjectByName(name)?.removeFromParent();
  const brick = { tile: 0.7 };
  const hearth = m("T_hearth");
  const soot = m("T_soot");
  const loaf = flat("T_loaf", 0xb8752f);
  const flour = flat("T_flour", 0xe9e3d3);
  const burlap = flat("T_burlap", 0xa88a5c);
  const twine = flat("T_twine", 0x5e4a2e);

  const { minX, maxX, minZ, maxZ, top } = OVEN;
  const store = { minX: -6.6, minZ: minZ + 0.25, maxZ: maxZ - 0.25 };
  const oven = new Piece("Bread_Oven", true)
    // The plinth, open at the front underneath to keep the firewood dry.
    .add(box([minX, 0.55, minZ], [maxX, top, maxZ], brick), hearth)
    .add(box([minX, 0, minZ], [maxX, 0.55, store.minZ], brick), hearth)
    .add(box([minX, 0, store.maxZ], [maxX, 0.55, maxZ], brick), hearth)
    .add(box([minX, 0, store.minZ], [store.minX, 0.55, store.maxZ], brick), hearth)
    .add(box([store.minX, 0, store.minZ], [store.minX + 0.02, 0.55, store.maxZ]), soot)
    .add(box([store.minX, 0, store.minZ], [maxX, 0.01, store.maxZ]), soot);
  const logs: [number, number][] = [
    [-6.48, 0.075], [-6.33, 0.075], [-6.18, 0.075], [-6.03, 0.075],
    [-6.405, 0.205], [-6.255, 0.205], [-6.105, 0.205],
    [-6.33, 0.335], [-6.18, 0.335],
  ];
  logs.forEach(([x, y], i) => {
    const shift = ((i * 37) % 7) / 7 - 0.5;
    oven.add(new CylinderGeometry(0.075, 0.075, 1.15, 6).rotateX(Math.PI / 2).translate(x, y, OVEN_MID.z + shift * 0.1), m("T_bark"));
  });

  // The dome, with a brick collar round the mouth and a ledge for the peel to rest on.
  const dome = turned([[OVEN_RADIUS, 0], [0.54, 0.17], [0.48, 0.34], [0.36, 0.48], [0.19, 0.58], [0, 0.62]], 10);
  oven.add(scaleUv(dome, 4, 1).translate(OVEN_MID.x, top, OVEN_MID.z), hearth);
  const mouthX = maxX + 0.07;
  oven
    .add(box([mouthX - 0.26, top, OVEN_MID.z - 0.3], [mouthX, top + 0.52, OVEN_MID.z + 0.3], brick), hearth)
    .add(box([maxX - 0.02, top - 0.06, OVEN_MID.z - 0.34], [maxX + 0.18, top + 0.02, OVEN_MID.z + 0.34]), m("T_stone"))
    .add(box([mouthX - 0.01, top + 0.02, OVEN_MID.z - 0.18], [mouthX + 0.01, top + 0.27, OVEN_MID.z + 0.18]), soot)
    .add(new CylinderGeometry(0.18, 0.18, 0.02, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(mouthX, top + 0.27, OVEN_MID.z), soot)
    // The fire glowing at the back of the mouth.
    .add(box([mouthX + 0.01, top + 0.02, OVEN_MID.z - 0.14], [mouthX + 0.02, top + 0.09, OVEN_MID.z + 0.14]), m("T_flame"))
    .add(box([mouthX + 0.01, top + 0.09, OVEN_MID.z - 0.06], [mouthX + 0.02, top + 0.14, OVEN_MID.z + 0.08]), m("T_flame"));
  // The flue, running from the back of the dome up the wall to the beams.
  oven.add(box([minX + 0.02, top + 0.4, OVEN_MID.z - 0.2], [minX + 0.4, WALL_HEIGHT, OVEN_MID.z + 0.2], brick), hearth);
  // Fresh loaves cooling on the plinth in front of the dome.
  for (const [x, z] of [[-6.62, 3.27], [-6.36, 3.24], [-6.1, 3.28]]) {
    oven.add(turned(LOAF, 7).translate(x, top, z), loaf);
  }
  oven.into(root);

  const light = new Object3D();
  light.name = "Light_Oven";
  light.position.set(mouthX + 0.45, top + 0.25, OVEN_MID.z);
  light.userData.light = "oven";
  root.add(light);

  // The baker's table, with the bread basket at its west end and dough being worked at the east.
  const table = new Piece("Baker_Table", true)
    .add(box([-5.7, 0.74, 3.95], [-4.4, 0.8, 4.75], { tile: 0.7 }), m("T_tabletop"))
    .add(box([-5.66, 0.16, 3.99], [-4.44, 0.2, 4.71], { tile: 0.8 }), m("T_wood"));
  for (const [x, z] of [[-5.66, 3.99], [-4.52, 3.99], [-5.66, 4.63], [-4.52, 4.63]]) {
    table.add(box([x, 0, z], [x + 0.08, 0.74, z + 0.08], { swap: true }), m("T_wood"));
  }
  table
    .add(box([-4.82, 0.8, 4.05], [-4.45, 0.803, 4.65]), flour)
    .add(turned([[0.1, 0], [0.11, 0.03], [0.07, 0.06], [0, 0.065]], 7).translate(-4.62, 0.803, 4.45), flour)
    .add(new CylinderGeometry(0.03, 0.03, 0.26, 6).rotateZ(Math.PI / 2).translate(-4.63, 0.833, 4.16), m("T_tabletop"))
    .add(new CylinderGeometry(0.012, 0.012, 0.36, 4).rotateZ(Math.PI / 2).translate(-4.63, 0.833, 4.16), m("T_wood"))
    .add(scaleUv(turned(SACK, 8), 2, 1).scale(0.8, 0.6, 0.8).translate(-5.05, 0.2, 4.35), burlap)
    .add(new CylinderGeometry(0.06, 0.06, 0.03, 6).translate(-5.05, 0.2 + 0.6 * 0.6, 4.35), twine);
  table.into(root);

  // Flour sacks and the baker's peel, against the west wall north of the oven.
  const corner = new Piece("Bakery_Corner", true);
  for (const [x, z, height] of [[-6.66, 2.42, 1], [-6.2, 2.32, 0.82]]) {
    corner
      .add(scaleUv(turned(SACK, 8), 2, 1).scale(1, height, 1).translate(x, 0, z), burlap)
      .add(new CylinderGeometry(0.07, 0.07, 0.03, 6).translate(x, 0.6 * height, z), twine);
  }
  const lean = 0.22;
  corner
    .add(box([-0.012, 0.02, -0.15], [0.012, 0.36, 0.15], { tile: 2 }).rotateZ(lean).translate(-6.62, 0, 2.93), m("T_crate"))
    .add(new CylinderGeometry(0.022, 0.022, 1.25, 5).translate(0, 0.36 + 0.625, 0).rotateZ(lean).translate(-6.62, 0, 2.93), m("T_wood"));
  corner.into(root);
}

/** A brass service bell on a wooden foot, standing at the origin. */
export function makeBell(): Object3D {
  const brass = flat("T_brass", COLORS.brass);
  const wood = flat("T_bell_foot", 0x4a2e1a);
  const bell = new Group();
  bell.name = "Bell";
  bell.add(new Mesh(new CylinderGeometry(0.085, 0.09, 0.025, 8).translate(0, 0.0125, 0), wood));
  const dome = [
    new Vector2(0.075, 0),
    new Vector2(0.072, 0.02),
    new Vector2(0.058, 0.055),
    new Vector2(0.036, 0.085),
    new Vector2(0.012, 0.097),
    new Vector2(0, 0.099),
  ];
  bell.add(new Mesh(new LatheGeometry(dome, 8).translate(0, 0.025, 0), brass));
  bell.add(new Mesh(new CylinderGeometry(0.008, 0.008, 0.03, 4).translate(0, 0.135, 0), brass));
  bell.add(new Mesh(new CylinderGeometry(0.016, 0.016, 0.01, 6).translate(0, 0.152, 0), brass));
  bell.traverse((object) => (object.name ||= "Bell_Part"));
  // Larger than life, like the carried dishes, so it reads from the camera.
  bell.scale.setScalar(BELL_SCALE);
  return bell;
}
