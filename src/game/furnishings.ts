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
  new Piece("Bedroom_Wall_E", true)
    .add(box([maxX, 0, minZ], [maxX + WALL, WALL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
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
