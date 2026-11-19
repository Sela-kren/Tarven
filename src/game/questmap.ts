/**
 * A quest's map drawn and played (questfield.ts lays it out): its ground and path, the props off the path, the
 * monsters in their clearings and what they do, the markers on the checks and choices, and the way home.
 *
 * It stands in the same scene as the tavern and the town, far off to the east (`FIELD_ORIGIN`), where neither of
 * their cameras ever looks. Everything is made of plain shapes in flat colours until the monsters are modelled.
 *
 * A monster stands about its clearing until she comes near (`AGGRO_RANGE`), then comes for her, and when it reaches
 * her it's a brawl (the taproom's brawl screen, fight.ts) against it and the rest of its pack. One she runs far
 * enough from goes back to its clearing; she can always outrun them.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { type Rect, resolveCircle } from "./collision";
import { solidRetroMaterial } from "./retro";
import {
  AGGRO_RANGE,
  BOSS_AGGRO_RANGE,
  SHAPES,
  type FieldPlan,
  type FieldTheme,
  type MonsterShape,
  type MonsterSpec,
  type PropKind,
} from "./questfield";

/** Where a quest's map stands in the world: far east of the tavern and the town. */
export const FIELD_ORIGIN = new Vector3(400, 0, 0);

/** How far a monster follows her from its clearing before it gives up and goes back. */
const LEASH = 16;
/** Seconds a monster takes to go down. */
const DEATH_TIME = 0.7;

const THEME_COLORS: Readonly<Record<FieldTheme, { ground: number; path: number; clearing: number }>> = {
  woods: { ground: 0x4f7f34, path: 0x8d7556, clearing: 0x6b8f3e },
  pass: { ground: 0xdfe6ec, path: 0xa79f96, clearing: 0xcfd8de },
  ruins: { ground: 0x5d5a52, path: 0x8a847a, clearing: 0x77726a },
  alleys: { ground: 0x5f5850, path: 0x857a6c, clearing: 0x7a7064 },
  road: { ground: 0x6f8a3c, path: 0x9a8566, clearing: 0x8f8a5a },
};

const PROP_COLORS = {
  trunk: 0x5a4030,
  leaves: 0x3f7a34,
  leavesDark: 0x2f5f2c,
  pine: 0x2f5a35,
  snow: 0xf2f5f8,
  rock: 0x8a857c,
  rockDark: 0x6a665f,
  stone: 0xa49d90,
  wood: 0x8a6440,
  woodDark: 0x5e4129,
  plaster: 0xd9cdb4,
  roof: 0x8a3b2a,
  bush: 0x3c6e2e,
};

// ---------------------------------------------------------------------------------------------------------------
// Props, drawn instanced: one mesh per part, however many of them stand on the map.
// ---------------------------------------------------------------------------------------------------------------

interface Part {
  geo: BufferGeometry;
  color: number;
  /** Its place on the prop at scale 1: offset, and its own scale. */
  at: [number, number, number];
  size?: [number, number, number];
}

const box = new BoxGeometry(1, 1, 1);
const ball = new SphereGeometry(0.5, 8, 6);
const cone = new ConeGeometry(0.5, 1, 7);
const can = new CylinderGeometry(0.5, 0.5, 1, 8);
const rockGeo = new DodecahedronGeometry(0.5, 0);

/** Each prop as parts, its foot at the origin. */
const PROP_PARTS: Readonly<Record<PropKind, readonly Part[]>> = {
  tree: [
    { geo: can, color: PROP_COLORS.trunk, at: [0, 1, 0], size: [0.35, 2, 0.35] },
    { geo: ball, color: PROP_COLORS.leaves, at: [0, 2.6, 0], size: [2.4, 2.2, 2.4] },
    { geo: ball, color: PROP_COLORS.leavesDark, at: [0.4, 3.3, 0.2], size: [1.5, 1.4, 1.5] },
  ],
  pine: [
    { geo: can, color: PROP_COLORS.trunk, at: [0, 0.5, 0], size: [0.3, 1, 0.3] },
    { geo: cone, color: PROP_COLORS.pine, at: [0, 2, 0], size: [2, 2.6, 2] },
    { geo: cone, color: PROP_COLORS.pine, at: [0, 3.4, 0], size: [1.4, 2, 1.4] },
  ],
  bush: [{ geo: ball, color: PROP_COLORS.bush, at: [0, 0.4, 0], size: [1.3, 0.9, 1.3] }],
  rock: [{ geo: rockGeo, color: PROP_COLORS.rock, at: [0, 0.3, 0], size: [0.9, 0.7, 0.8] }],
  boulder: [
    { geo: rockGeo, color: PROP_COLORS.rockDark, at: [0, 0.8, 0], size: [2, 1.7, 1.8] },
    { geo: rockGeo, color: PROP_COLORS.rock, at: [0.8, 0.4, 0.5], size: [0.9, 0.8, 0.9] },
  ],
  snowbank: [{ geo: ball, color: PROP_COLORS.snow, at: [0, 0.15, 0], size: [2, 0.8, 1.4] }],
  pillar: [
    { geo: box, color: PROP_COLORS.stone, at: [0, 0.15, 0], size: [1, 0.3, 1] },
    { geo: can, color: PROP_COLORS.stone, at: [0, 1.6, 0], size: [0.7, 2.8, 0.7] },
  ],
  wall: [{ geo: box, color: PROP_COLORS.stone, at: [0, 1.1, 0], size: [2.2, 2.2, 0.7] }],
  rubble: [
    { geo: rockGeo, color: PROP_COLORS.stone, at: [0, 0.2, 0], size: [0.7, 0.4, 0.6] },
    { geo: box, color: PROP_COLORS.stone, at: [0.5, 0.15, 0.3], size: [0.6, 0.3, 0.4] },
  ],
  crate: [{ geo: box, color: PROP_COLORS.wood, at: [0, 0.4, 0], size: [0.8, 0.8, 0.8] }],
  barrel: [{ geo: can, color: PROP_COLORS.woodDark, at: [0, 0.45, 0], size: [0.6, 0.9, 0.6] }],
  fence: [
    { geo: box, color: PROP_COLORS.wood, at: [0, 0.5, 0], size: [1.1, 0.1, 0.08] },
    { geo: box, color: PROP_COLORS.woodDark, at: [-0.5, 0.4, 0], size: [0.12, 0.8, 0.12] },
  ],
  house: [
    { geo: box, color: PROP_COLORS.plaster, at: [0, 1.6, 0], size: [1, 3.2, 1] },
    { geo: box, color: PROP_COLORS.roof, at: [0, 3.4, 0], size: [1.1, 0.5, 1.1] },
  ],
};

/** Gathers every part's matrices, then makes one instanced mesh per part. */
class Instancer {
  private readonly parts = new Map<string, { geo: BufferGeometry; color: number; matrices: Matrix4[] }>();

  add(kind: string, part: Part, index: number, place: Matrix4): void {
    const key = `${kind}:${index}`;
    let entry = this.parts.get(key);
    if (!entry) {
      entry = { geo: part.geo, color: part.color, matrices: [] };
      this.parts.set(key, entry);
    }
    const local = new Matrix4().compose(new Vector3(...part.at), new Quaternion(), new Vector3(...(part.size ?? [1, 1, 1])));
    entry.matrices.push(place.clone().multiply(local));
  }

  build(into: Group): void {
    for (const [key, { geo, color, matrices }] of this.parts) {
      const mesh = new InstancedMesh(geo, solidRetroMaterial(`Field_${key}`, color), matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.frustumCulled = false;
      into.add(mesh);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------------------------------------------

/** A monster's model: its parts and the bits that move (legs swing, a slime squashes, a head bobs). */
interface MonsterModel {
  root: Group;
  /** The part that rears up before a blow, and bobs as it moves. */
  body: Object3D;
  legs: Object3D[];
  materials: MeshLambertMaterial[];
}

function monsterModel(spec: MonsterSpec): MonsterModel {
  const root = new Group();
  const body = new Group();
  root.add(body);
  const materials: MeshLambertMaterial[] = [];
  const mat = (color: number) => {
    const m = solidRetroMaterial(`Monster_${spec.shape}`, color);
    materials.push(m);
    return m;
  };
  const tint = spec.tint;
  const part = (parent: Object3D, geo: BufferGeometry, color: number, at: [number, number, number], size: [number, number, number], rotX = 0): Mesh => {
    const mesh = new Mesh(geo, mat(color));
    mesh.position.set(...at);
    mesh.scale.set(...size);
    mesh.rotation.x = rotX;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const legs: Object3D[] = [];
  const leg = (x: number, z: number, h: number, w: number, color: number) => {
    const pivot = new Group();
    pivot.position.set(x, h, z);
    part(pivot, box, color, [0, -h / 2, 0], [w, h, w]);
    body.add(pivot);
    legs.push(pivot);
  };
  const eyes = (y: number, z: number, apart: number, s: number, color = 0xffe066) => {
    part(body, ball, color, [-apart, y, z], [s, s, s]);
    part(body, ball, color, [apart, y, z], [s, s, s]);
  };

  const shape: MonsterShape = spec.shape;
  if (shape === "rat") {
    const fur = tint ?? 0x6e6258;
    part(body, ball, fur, [0, 0.22, 0], [0.4, 0.32, 0.65]);
    part(body, ball, fur, [0, 0.27, -0.36], [0.26, 0.24, 0.3]);
    part(body, cone, 0xd99a9a, [0, 0.25, -0.53], [0.1, 0.14, 0.1], -Math.PI / 2);
    part(body, ball, 0xd99a9a, [-0.1, 0.4, -0.32], [0.1, 0.12, 0.05]);
    part(body, ball, 0xd99a9a, [0.1, 0.4, -0.32], [0.1, 0.12, 0.05]);
    part(body, can, 0xd99a9a, [0, 0.18, 0.55], [0.04, 0.5, 0.04], Math.PI / 2.3);
    eyes(0.32, -0.46, 0.07, 0.05, 0xff3030);
    for (const [x, z] of [[-0.14, -0.18], [0.14, -0.18], [-0.14, 0.2], [0.14, 0.2]]) leg(x, z, 0.12, 0.06, fur);
  } else if (shape === "boar") {
    const hide = tint ?? 0x5a3f2c;
    part(body, ball, hide, [0, 0.62, 0], [0.75, 0.7, 1.15]);
    part(body, box, hide, [0, 0.62, -0.62], [0.45, 0.42, 0.4]);
    part(body, can, 0xb88a78, [0, 0.55, -0.86], [0.24, 0.12, 0.24], Math.PI / 2);
    part(body, cone, 0xf2ead8, [-0.17, 0.52, -0.8], [0.06, 0.26, 0.06], -0.6);
    part(body, cone, 0xf2ead8, [0.17, 0.52, -0.8], [0.06, 0.26, 0.06], -0.6);
    part(body, box, 0x2f2218, [0, 0.98, 0.05], [0.12, 0.18, 0.9]);
    eyes(0.72, -0.82, 0.13, 0.06, 0x200000);
    for (const [x, z] of [[-0.22, -0.35], [0.22, -0.35], [-0.22, 0.35], [0.22, 0.35]]) leg(x, z, 0.35, 0.14, 0x3f2c1f);
  } else if (shape === "wolf") {
    const fur = tint ?? 0x77726c;
    part(body, ball, fur, [0, 0.72, 0], [0.5, 0.5, 1.1]);
    part(body, ball, fur, [0, 0.95, -0.55], [0.4, 0.38, 0.42]);
    part(body, cone, fur, [0, 0.9, -0.85], [0.2, 0.36, 0.2], -Math.PI / 2);
    part(body, cone, fur, [-0.12, 1.2, -0.5], [0.1, 0.22, 0.08]);
    part(body, cone, fur, [0.12, 1.2, -0.5], [0.1, 0.22, 0.08]);
    part(body, cone, fur, [0, 0.85, 0.65], [0.14, 0.6, 0.14], 2.2);
    eyes(1.0, -0.72, 0.1, 0.06, 0xffd040);
    for (const [x, z] of [[-0.15, -0.35], [0.15, -0.35], [-0.15, 0.35], [0.15, 0.35]]) leg(x, z, 0.5, 0.1, fur);
  } else if (shape === "spider") {
    const shell = tint ?? 0x2a2430;
    part(body, ball, shell, [0, 0.5, 0.25], [0.8, 0.65, 0.9]);
    part(body, ball, shell, [0, 0.45, -0.3], [0.45, 0.38, 0.45]);
    part(body, box, 0xb02020, [0, 0.83, 0.3], [0.3, 0.05, 0.3]);
    eyes(0.55, -0.5, 0.08, 0.06, 0xff3030);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const pivot = new Group();
        pivot.position.set(side * 0.2, 0.5, -0.35 + i * 0.22);
        pivot.rotation.z = side * -1.0;
        pivot.rotation.y = side * (i - 1.5) * 0.35;
        part(pivot, box, shell, [side * 0.38, 0, 0], [0.75, 0.05, 0.05]);
        body.add(pivot);
        legs.push(pivot);
      }
    }
  } else if (shape === "slime") {
    const goo = tint ?? 0x6fd36a;
    part(body, ball, goo, [0, 0.38, 0], [1, 0.76, 1]);
    part(body, ball, 0xb8f0a8, [-0.18, 0.55, -0.2], [0.25, 0.2, 0.2]);
    eyes(0.5, -0.44, 0.14, 0.11, 0x101010);
  } else if (shape === "ghoul") {
    const skin = tint ?? 0x8a9a80;
    part(body, ball, 0x4a4438, [0, 1.0, 0], [0.55, 0.85, 0.4]);
    part(body, ball, skin, [0, 1.55, -0.15], [0.36, 0.4, 0.36]);
    eyes(1.6, -0.32, 0.08, 0.06, 0x80ff90);
    for (const x of [-0.32, 0.32]) {
      const arm = new Group();
      arm.position.set(x, 1.3, -0.05);
      arm.rotation.x = -0.9;
      part(arm, box, skin, [0, -0.4, 0], [0.1, 0.85, 0.1]);
      body.add(arm);
      legs.push(arm);
    }
    for (const x of [-0.13, 0.13]) leg(x, 0.05, 0.6, 0.13, 0x3a352c);
  } else if (shape === "guardian") {
    const stone = tint ?? 0x8f8a7e;
    part(body, box, stone, [0, 1.15, 0], [0.9, 0.9, 0.6]);
    part(body, box, stone, [0, 1.85, 0], [0.5, 0.45, 0.45]);
    const core = part(body, ball, 0x60e0ff, [0, 1.2, -0.31], [0.24, 0.24, 0.1]);
    (core.material as MeshLambertMaterial).emissive = new Color(0x2090c0);
    eyes(1.9, -0.23, 0.11, 0.07, 0x60e0ff);
    for (const x of [-0.62, 0.62]) {
      const arm = new Group();
      arm.position.set(x, 1.5, 0);
      part(arm, box, stone, [0, -0.45, 0], [0.3, 0.9, 0.3]);
      body.add(arm);
      legs.push(arm);
    }
    for (const x of [-0.22, 0.22]) leg(x, 0, 0.7, 0.3, stone);
  } else {
    // A troll: three times her height, pale as the snow.
    const hide = tint ?? 0x9fb4c0;
    part(body, ball, hide, [0, 1.55, 0], [1.3, 1.4, 0.95]);
    part(body, ball, hide, [0, 2.35, -0.25], [0.6, 0.55, 0.55]);
    part(body, box, 0x6a5040, [0, 1.0, 0], [1.2, 0.35, 0.9]);
    eyes(2.45, -0.5, 0.14, 0.08, 0xffb030);
    for (const x of [-0.85, 0.85]) {
      const arm = new Group();
      arm.position.set(x, 2.0, 0);
      part(arm, box, hide, [0, -0.7, 0], [0.38, 1.5, 0.38]);
      body.add(arm);
      legs.push(arm);
    }
    for (const x of [-0.35, 0.35]) leg(x, 0, 0.9, 0.42, hide);
  }
  root.scale.setScalar(spec.size);
  return { root, body, legs, materials };
}

export type MonsterState = "idle" | "chase" | "home" | "calm" | "dying" | "dead";

export class FieldMonster {
  readonly model: MonsterModel;
  readonly position: Vector3;
  readonly home: Vector3;
  state: MonsterState = "idle";
  /** Seconds until it's gone, and its walk. */
  private dying = 0;
  private stride = 0;
  private wander = 0;
  private readonly wanderTo = new Vector3();
  private heading = 0;

  constructor(
    readonly spec: MonsterSpec,
    readonly encounter: number,
    at: Vector3,
  ) {
    this.model = monsterModel(spec);
    this.position = this.model.root.position;
    this.position.copy(at);
    this.home = at.clone();
    this.wanderTo.copy(at);
    this.heading = Math.random() * Math.PI * 2;
    this.model.root.rotation.y = this.heading;
  }

  get alive(): boolean {
    return this.state !== "dying" && this.state !== "dead";
  }

  get radius(): number {
    return SHAPES[this.spec.shape].radius * this.spec.size;
  }

  /** Beaten in the brawl: it goes down where it stands. */
  defeat(): void {
    if (!this.alive) return;
    this.state = "dying";
    this.dying = DEATH_TIME;
  }

  /** It beat her, and has had enough: back to its clearing, and it leaves her be. */
  calm(): void {
    if (this.alive) this.state = "calm";
  }

  /** A copy of its model as it stands at rest, for the brawl's picture of it. */
  portrait(): Object3D {
    const copy = monsterModel(this.spec).root;
    copy.scale.setScalar(this.spec.size);
    return copy;
  }

  /**
   * A frame: it stands about, comes for her once she's near, or goes home. Returns true on the frame it reaches
   * her (and the brawl starts).
   */
  update(dt: number, her: Vector3, colliders: readonly Rect[], others: readonly FieldMonster[]): boolean {
    const m = this.model;
    if (this.state === "dead") return false;
    if (this.state === "dying") {
      this.dying -= dt;
      const k = Math.max(0, this.dying / DEATH_TIME);
      m.body.rotation.z = (1 - k) * 1.4;
      m.root.position.y = -(1 - k) * 0.3 * this.spec.size;
      m.root.scale.setScalar(this.spec.size * (0.4 + 0.6 * k));
      if (this.dying <= 0) {
        this.state = "dead";
        m.root.visible = false;
      }
      return false;
    }

    const toHer = { x: her.x - this.position.x, z: her.z - this.position.z };
    const dist = Math.hypot(toHer.x, toHer.z);
    const fromHome = Math.hypot(her.x - this.home.x, her.z - this.home.z);
    const aggro = this.spec.boss ? BOSS_AGGRO_RANGE : AGGRO_RANGE;
    let touched = false;
    let moving = false;
    let speed = 0;
    let goal: { x: number; z: number } | null = null;

    if (this.state === "idle" || this.state === "calm") {
      if (this.state === "idle" && dist < aggro) this.state = "chase";
      else {
        this.wander -= dt;
        if (this.wander <= 0) {
          this.wander = 2 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2;
          this.wanderTo.set(this.home.x + Math.cos(a) * 1.5, 0, this.home.z + Math.sin(a) * 1.5);
        }
        goal = this.wanderTo;
        speed = this.spec.speed * 0.25;
      }
    }
    if (this.state === "home") {
      goal = this.home;
      speed = this.spec.speed;
      if (Math.hypot(this.home.x - this.position.x, this.home.z - this.position.z) < 0.5) this.state = "idle";
      else if (dist < aggro * 0.6) this.state = "chase";
    }
    if (this.state === "chase") {
      if (fromHome > LEASH) this.state = "home";
      else if (dist <= this.spec.reach) touched = true;
      else {
        goal = her;
        speed = this.spec.speed;
      }
      this.heading = Math.atan2(-toHer.x, -toHer.z);
    }

    if (goal) {
      const gx = goal.x - this.position.x;
      const gz = goal.z - this.position.z;
      const gd = Math.hypot(gx, gz);
      if (gd > 0.05) {
        const step = Math.min(gd, speed * dt);
        this.position.x += (gx / gd) * step;
        this.position.z += (gz / gd) * step;
        moving = true;
        if (this.state !== "chase") this.heading = Math.atan2(-gx, -gz);
      }
    }
    // Keep off the others, and out of the trees.
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const dx = this.position.x - o.position.x;
      const dz = this.position.z - o.position.z;
      const d = Math.hypot(dx, dz);
      const min = this.radius + o.radius;
      if (d > 0.001 && d < min) {
        this.position.x += (dx / d) * (min - d) * 0.5;
        this.position.z += (dz / d) * (min - d) * 0.5;
      }
    }
    const clear = resolveCircle(this.position, this.radius, colliders, 4);
    this.position.x = clear.x;
    this.position.z = clear.z;

    // Turning, and the legs.
    let turn = this.heading - m.root.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    m.root.rotation.y += turn * Math.min(1, dt * 10);
    if (moving) this.stride += dt * speed * 4;
    const swing = moving ? Math.sin(this.stride) * 0.6 : 0;
    m.legs.forEach((leg, i) => {
      if (this.spec.shape === "spider") leg.rotation.x = Math.sin(this.stride + i) * 0.3;
      else leg.rotation.x = (i % 2 === 0 ? 1 : -1) * swing;
    });
    if (this.spec.shape === "slime") {
      const t = performance.now() / 1000;
      const squash = 1 + Math.sin(t * (moving ? 9 : 3)) * 0.1;
      m.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    } else {
      m.body.position.y = moving ? Math.abs(Math.sin(this.stride)) * 0.05 : 0;
    }
    return touched;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------------------------------------------

/** A marker over something to look at: a glowing post that bobs until she's dealt with it. */
interface Marker {
  encounter: number;
  root: Group;
  done: boolean;
}

export class QuestMap {
  readonly root = new Group();
  readonly colliders: Rect[];
  readonly cameraLimits: Rect;
  readonly monsters: FieldMonster[] = [];
  /** Where she arrives, which way she faces, and the way home, in the world. */
  readonly start: Vector3;
  readonly startHeading: number;
  readonly exit: Vector3;
  private readonly markers: Marker[] = [];
  private clock = 0;

  constructor(readonly plan: FieldPlan) {
    const o = FIELD_ORIGIN;
    const { bounds, theme, clearings } = plan;
    const colors = THEME_COLORS[theme];

    // The ground, the path and the clearings.
    const w = bounds.maxX - bounds.minX + 40;
    const d = bounds.maxZ - bounds.minZ + 40;
    const ground = new Mesh(new PlaneGeometry(w, d), solidRetroMaterial("Field_Ground", colors.ground));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    ground.receiveShadow = true;
    this.root.add(ground);
    const pathMat = solidRetroMaterial("Field_Path", colors.path);
    const clearingMat = solidRetroMaterial("Field_Clearing", colors.clearing);
    for (let i = 1; i < clearings.length; i++) {
      const a = clearings[i - 1];
      const b = clearings[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const strip = new Mesh(new PlaneGeometry(plan.pathWidth * 0.8, len), pathMat);
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = Math.atan2(b.x - a.x, -(b.z - a.z));
      strip.position.set((a.x + b.x) / 2, 0.02, (a.z + b.z) / 2);
      strip.receiveShadow = true;
      this.root.add(strip);
    }
    for (const c of clearings) {
      const disc = new Mesh(new CylinderGeometry(c.r, c.r, 0.02, 24), clearingMat);
      disc.position.set(c.x, 0.01, c.z);
      disc.receiveShadow = true;
      this.root.add(disc);
    }

    // The props.
    const inst = new Instancer();
    const place = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    for (const p of plan.props) {
      // Walls and fences and houses stand square to the path's general run; the rest turn any way.
      const turn = p.kind === "house" || p.kind === "wall" || p.kind === "fence" ? Math.round(p.turn / (Math.PI / 2)) * (Math.PI / 2) : p.turn;
      place.compose(new Vector3(p.x, 0, p.z), q.setFromAxisAngle(up, turn), new Vector3(p.scale, p.scale, p.scale));
      PROP_PARTS[p.kind].forEach((part, i) => inst.add(p.kind, part, i, place));
    }
    inst.build(this.root);

    // The way home: a signpost at the edge of the first clearing.
    const post = new Group();
    const wood = solidRetroMaterial("Field_Sign", PROP_COLORS.wood);
    const pole = new Mesh(can, wood);
    pole.scale.set(0.12, 1.6, 0.12);
    pole.position.y = 0.8;
    const board = new Mesh(box, wood);
    board.scale.set(0.9, 0.3, 0.06);
    board.position.y = 1.4;
    post.add(pole, board);
    post.position.set(plan.exit.x + 1.2, 0, plan.exit.z + 0.6);
    this.root.add(post);

    // What waits in each clearing.
    for (const s of plan.spawns) {
      if (s.kind === "monsters") {
        for (const m of s.monsters) {
          const monster = new FieldMonster(m.spec, s.encounter, new Vector3(m.at.x + o.x, 0, m.at.z + o.z));
          this.monsters.push(monster);
        }
      } else if (s.kind === "spot") {
        const marker = new Group();
        const stone = new Mesh(rockGeo, solidRetroMaterial("Field_SpotStone", PROP_COLORS.stone));
        stone.scale.set(0.6, 0.5, 0.6);
        stone.position.y = 0.2;
        const glow = solidRetroMaterial("Field_SpotGlow", 0xffd040);
        glow.emissive = new Color(0xc08010);
        const gem = new Mesh(new ConeGeometry(0.18, 0.4, 4), glow);
        gem.position.y = 1.4;
        gem.rotation.x = Math.PI;
        marker.add(stone, gem);
        marker.position.set(s.at.x, 0, s.at.z);
        this.root.add(marker);
        this.markers.push({ encounter: s.encounter, root: marker, done: false });
      }
    }

    this.root.position.copy(o);
    this.root.updateMatrixWorld(true);
    this.colliders = plan.blocked.map((r) => ({ minX: r.minX + o.x, maxX: r.maxX + o.x, minZ: r.minZ + o.z, maxZ: r.maxZ + o.z }));
    this.cameraLimits = { minX: bounds.minX + o.x + 6, maxX: bounds.maxX + o.x - 6, minZ: bounds.minZ + o.z + 4, maxZ: bounds.maxZ + o.z - 2 };
    this.start = new Vector3(plan.start.x + o.x, 0, plan.start.z + o.z);
    this.startHeading = plan.startHeading;
    this.exit = new Vector3(plan.exit.x + o.x, 0, plan.exit.z + o.z);
  }

  /** The monsters' layer, in world space (they move, so they're kept out of the map's own group). */
  monsterLayer(): Group {
    const layer = new Group();
    for (const m of this.monsters) layer.add(m.model.root);
    return layer;
  }

  /** Where an encounter's clearing is, in the world. */
  spotOf(encounter: number): Vector3 {
    const s = this.plan.spawns[encounter];
    return new Vector3(s.at.x + FIELD_ORIGIN.x, 0, s.at.z + FIELD_ORIGIN.z);
  }

  /** Puts out an encounter's marker once she's dealt with it. */
  markDone(encounter: number): void {
    for (const m of this.markers) if (m.encounter === encounter && !m.done) {
      m.done = true;
      m.root.children[1].visible = false;
    }
  }

  /** Monsters still standing in an encounter's clearing. */
  aliveIn(encounter: number): number {
    return this.monsters.filter((m) => m.encounter === encounter && m.alive).length;
  }

  /** A frame of the monsters and the markers. Returns the first monster to reach her this frame, if any. */
  update(dt: number, her: Vector3): FieldMonster | null {
    this.clock += dt;
    for (const m of this.markers) {
      if (m.done) continue;
      const gem = m.root.children[1];
      gem.position.y = 1.4 + Math.sin(this.clock * 3) * 0.12;
      gem.rotation.y += dt * 2;
    }
    let reached: FieldMonster | null = null;
    for (const m of this.monsters) if (m.update(dt, her, this.colliders, this.monsters) && !reached) reached = m;
    return reached;
  }

  /** The monsters of an encounter still standing, the one that reached her first. */
  pack(encounter: number, first?: FieldMonster): FieldMonster[] {
    const pack = this.monsters.filter((m) => m.encounter === encounter && m.alive && m.state !== "calm");
    return first ? [first, ...pack.filter((m) => m !== first)] : pack;
  }
}
