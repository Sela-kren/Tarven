/**
 * The house plans: buy and sell floor, draw walls, and place, move and store furniture. Time stops and the
 * camera is free while it's open. The rules are in `HousePlan`; this is the mouse, the keys and the toolbar.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from "three";
import type { Rect } from "./collision";
import {
  edgeAt,
  edgeRect,
  faceTable,
  footprint,
  FURNITURE_KINDS,
  FURNITURE_NAMES,
  FURNITURE_PRICES,
  LOT_BOUNDS,
  MIN_SEATS,
  refund,
  seatSpecs,
  TILE_COST,
  WALL_COST,
  type FurnitureKind,
  type HousePlan,
  type Placed,
} from "./house";
import type { HouseView } from "./houseview";
import type { Input } from "./input";

type Tool = "hand" | "floor" | "sell" | "wall" | "unwall";

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "hand", label: "Move", hint: "Click furniture to pick it up. R turns it, X or Delete sends it to storage." },
  { id: "floor", label: "Buy floor", hint: `Drag over the blue squares to buy floor (${TILE_COST}g each). The walls move out to fit.` },
  { id: "sell", label: "Sell floor", hint: `Drag over floor you bought to sell it for ${refund(TILE_COST)}g.` },
  { id: "wall", label: "Draw wall", hint: `Drag along the floor lines to draw walls (${WALL_COST}g each). Leave a gap for a doorway.` },
  { id: "unwall", label: "Remove wall", hint: "Drag along walls you drew to take them down." },
];

const PAN_SPEED = 9;
/** Furniture snaps to quarter-metre steps. */
const SNAP = 4;
/** Heights checked when clicking furniture: table tops first, so what you see is what you get. */
const PICK_HEIGHTS = [0.8, 0.5, 0];
const PICK_MARGIN = 0.08;
const OVERLAY_HEIGHT = 0.03;
const GOOD = 0x58d68d;
const BAD = 0xe0533d;
const HOVER = 0xf0e4c4;
const BLUEPRINT = 0x4a90e2;
/** Far enough south that the toolbar doesn't cover the front of the room. */
const STARTING_FOCUS = new Vector3(0, 0.8, 2.5);

/** What the build mode needs from the game. */
export interface BuildHost {
  camera: Camera;
  plan(): HousePlan;
  gold(): number;
  addGold(amount: number): void;
  /** What furniture can't overlap, beyond the plan's own walls and furniture. */
  blockers(): readonly Rect[];
  /** What the plan as it stands cuts off, in words, or null. */
  routeProblem(): string | null;
  leave(): void;
}

interface Held {
  kind: FurnitureKind;
  /** Bought pieces aren't paid for until they're put down; moved and stored ones go back if cancelled. */
  source: "bought" | "stored" | "moved";
  /** Where a moved piece came from. */
  from: Placed | null;
  turn: number;
  ghost: Object3D;
}

export class BuildMode {
  readonly focus = STARTING_FOCUS.clone();

  private active = false;
  private tool: Tool = "hand";
  private held: Held | null = null;
  private message = "";
  private dragging = false;
  private readonly visited = new Set<string>();

  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2(0, 0);
  private readonly floorPoint = new Vector3();
  private readonly overlay = new Object3D();
  private readonly grid: LineSegments;
  private readonly buyable = new Mesh(
    new BufferGeometry(),
    new MeshBasicMaterial({ color: BLUEPRINT, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  private readonly cursorMaterial = new MeshBasicMaterial({ color: GOOD, transparent: true, opacity: 0.5, depthWrite: false });
  private readonly cursor = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.cursorMaterial);

  private readonly toolsEl = document.createElement("div");
  private readonly shopEl = document.createElement("div");
  private readonly noteEl = document.createElement("div");

  constructor(
    root: HTMLElement,
    scene: Scene,
    private readonly view: HouseView,
    private readonly input: Input,
    private readonly host: BuildHost,
  ) {
    this.toolsEl.className = "row";
    this.shopEl.className = "row";
    this.noteEl.className = "note";
    root.append(this.toolsEl, this.shopEl, this.noteEl);

    this.grid = this.makeGrid();
    this.buyable.position.y = OVERLAY_HEIGHT;
    this.cursor.position.y = OVERLAY_HEIGHT * 2;
    this.overlay.add(this.grid, this.buyable, this.cursor);
    this.overlay.visible = false;
    scene.add(this.overlay);

    window.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    window.addEventListener("pointerup", () => (this.dragging = false));
    window.addEventListener("contextmenu", (event) => {
      if (!this.active) return;
      event.preventDefault();
      this.cancelHeld();
    });
  }

  private get plan(): HousePlan {
    return this.host.plan();
  }

  private makeGrid(): LineSegments {
    const { minX, maxX, minZ, maxZ } = LOT_BOUNDS;
    const points: number[] = [];
    for (let x = minX; x <= maxX; x++) points.push(x, OVERLAY_HEIGHT, minZ, x, OVERLAY_HEIGHT, maxZ);
    for (let z = minZ; z <= maxZ; z++) points.push(minX, OVERLAY_HEIGHT, z, maxX, OVERLAY_HEIGHT, z);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
    return new LineSegments(geometry, new LineBasicMaterial({ color: BLUEPRINT, transparent: true, opacity: 0.3 }));
  }

  enter(): void {
    this.active = true;
    this.focus.copy(STARTING_FOCUS);
    this.overlay.visible = true;
    this.setTool("hand");
    this.root().classList.add("open");
  }

  private root(): HTMLElement {
    return this.toolsEl.parentElement as HTMLElement;
  }

  /** Esc: drops what you're holding, or leaves if your hands are empty. */
  escape(): void {
    if (this.held) this.cancelHeld();
    else this.tryLeave();
  }

  private tryLeave(): void {
    this.cancelHeld();
    const seats = seatSpecs(this.plan.layout.furniture).length;
    if (seats < MIN_SEATS) {
      this.say(`Guests need somewhere to sit: put at least ${MIN_SEATS} seats beside tables or the bar (you have ${seats}).`);
      return;
    }
    this.active = false;
    this.dragging = false;
    this.overlay.visible = false;
    this.root().classList.remove("open");
    this.host.leave();
  }

  private say(text: string): void {
    this.message = text;
    this.render();
  }

  private setTool(tool: Tool): void {
    this.cancelHeld();
    this.tool = tool;
    this.message = "";
    this.refreshBuyable();
    this.render();
  }

  private redraw(): void {
    this.view.rebuild(this.plan);
    this.refreshBuyable();
    this.render();
  }

  /** The blue squares that show where floor can be bought. */
  private refreshBuyable(): void {
    this.buyable.visible = this.tool === "floor";
    if (!this.buyable.visible) return;
    const points: number[] = [];
    for (const [col, row] of this.plan.buyableTiles()) {
      const [x0, x1, z0, z1] = [col + 0.04, col + 0.96, row + 0.04, row + 0.96];
      points.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0);
    }
    this.buyable.geometry.dispose();
    this.buyable.geometry = new BufferGeometry();
    this.buyable.geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
  }

  private button(parent: HTMLElement, label: string, onPick: () => void, options: { on?: boolean; off?: boolean } = {}): void {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.disabled = Boolean(options.off);
    el.classList.toggle("on", Boolean(options.on));
    el.addEventListener("click", onPick);
    parent.append(el);
  }

  private render(): void {
    if (!this.active) return;
    const gold = this.host.gold();
    this.toolsEl.replaceChildren();
    for (const { id, label } of TOOLS) {
      this.button(this.toolsEl, label, () => this.setTool(id), { on: this.tool === id && !this.held });
    }
    const done = document.createElement("span");
    done.className = "spacer";
    this.toolsEl.append(done);
    this.button(this.toolsEl, "Done", () => this.tryLeave());

    this.shopEl.replaceChildren();
    const heading = (text: string) => {
      const el = document.createElement("span");
      el.className = "label";
      el.textContent = text;
      this.shopEl.append(el);
    };
    heading("Buy");
    for (const kind of FURNITURE_KINDS) {
      const price = FURNITURE_PRICES[kind];
      this.button(this.shopEl, `${FURNITURE_NAMES[kind]} ${price}g`, () => this.buy(kind), { off: gold < price });
    }
    heading("Storage");
    const stored = FURNITURE_KINDS.filter((kind) => this.plan.layout.stored.includes(kind));
    if (stored.length === 0) heading("empty");
    for (const kind of stored) {
      const count = this.plan.layout.stored.filter((other) => other === kind).length;
      this.button(this.shopEl, `${FURNITURE_NAMES[kind]} x${count}`, () => this.takeFromStorage(kind));
      this.button(this.shopEl, `sell +${refund(FURNITURE_PRICES[kind])}g`, () => this.sellStored(kind));
    }

    const seats = seatSpecs(this.plan.layout.furniture).length;
    const hint = this.held
      ? "Click to put it down. R turns it. X sends it to storage. Right-click or Esc cancels."
      : TOOLS.find(({ id }) => id === this.tool)?.hint;
    this.noteEl.textContent = `${seats} seats · ${this.message || hint}`;
  }

  private buy(kind: FurnitureKind): void {
    if (this.host.gold() < FURNITURE_PRICES[kind]) return;
    this.hold({ kind, source: "bought", from: null, turn: 0 });
  }

  private takeFromStorage(kind: FurnitureKind): void {
    const { stored } = this.plan.layout;
    stored.splice(stored.indexOf(kind), 1);
    this.hold({ kind, source: "stored", from: null, turn: 0 });
  }

  private sellStored(kind: FurnitureKind): void {
    const { stored } = this.plan.layout;
    stored.splice(stored.indexOf(kind), 1);
    this.host.addGold(refund(FURNITURE_PRICES[kind]));
    this.render();
  }

  private hold(held: Omit<Held, "ghost">): void {
    this.cancelHeld();
    this.tool = "hand";
    const ghost = this.view.makeGhost(held.kind);
    this.overlay.add(ghost);
    this.held = { ...held, ghost };
    this.message = "";
    this.refreshBuyable();
    this.render();
  }

  private releaseGhost(): void {
    this.held?.ghost.removeFromParent();
    this.held = null;
  }

  /** Puts what you're holding back where it came from. */
  private cancelHeld(): void {
    const { held } = this;
    if (!held) return;
    if (held.source === "stored") this.plan.layout.stored.push(held.kind);
    if (held.from) this.plan.layout.furniture.push(held.from);
    this.releaseGhost();
    this.redraw();
  }

  private storeHeld(): void {
    const { held } = this;
    if (!held) return;
    if (held.source === "bought") {
      this.cancelHeld();
      return;
    }
    this.plan.layout.stored.push(held.kind);
    this.releaseGhost();
    this.redraw();
  }

  /** The held piece as it would stand under the pointer, or null with the pointer off the floor. */
  private heldPlacement(): Placed | null {
    const { held } = this;
    if (!held || !this.aimAt(0)) return null;
    const item: Placed = {
      kind: held.kind,
      x: Math.round(this.floorPoint.x * SNAP) / SNAP,
      z: Math.round(this.floorPoint.z * SNAP) / SNAP,
      turn: held.turn,
    };
    item.turn = faceTable(item, this.plan.layout.furniture);
    return item;
  }

  private dropHeld(): void {
    const { held } = this;
    const item = this.heldPlacement();
    if (!held || !item) return;
    const { furniture } = this.plan.layout;
    const problem = this.plan.placeProblem(item, this.host.blockers());
    if (problem) {
      this.say(problem);
      return;
    }
    furniture.push(item);
    const blocked = this.host.routeProblem();
    if (blocked) {
      furniture.pop();
      this.say(blocked);
      return;
    }
    if (held.source === "bought") this.host.addGold(-FURNITURE_PRICES[held.kind]);
    this.releaseGhost();
    this.message = "";
    this.redraw();
  }

  /** Turns the held piece, or the one under the pointer if it still fits once turned. */
  private rotate(): void {
    if (this.held) {
      this.held.turn = (this.held.turn + 1) % 4;
      return;
    }
    const index = this.furnitureAt();
    if (index < 0) return;
    const { furniture } = this.plan.layout;
    const turned = { ...furniture[index], turn: (furniture[index].turn + 1) % 4 };
    const problem = this.plan.placeProblem(turned, this.host.blockers(), index);
    if (problem) {
      this.say(problem);
      return;
    }
    furniture[index] = turned;
    this.redraw();
  }

  private store(): void {
    if (this.held) {
      this.storeHeld();
      return;
    }
    const index = this.furnitureAt();
    if (index < 0) return;
    const { furniture, stored } = this.plan.layout;
    stored.push(furniture[index].kind);
    furniture.splice(index, 1);
    this.redraw();
  }

  private aimAt(height: number): boolean {
    this.raycaster.setFromCamera(this.pointer, this.host.camera);
    const plane = new Plane(new Vector3(0, 1, 0), -height);
    return this.raycaster.ray.intersectPlane(plane, this.floorPoint) !== null;
  }

  private furnitureAt(): number {
    const { furniture } = this.plan.layout;
    for (const height of PICK_HEIGHTS) {
      if (!this.aimAt(height)) continue;
      const { x, z } = this.floorPoint;
      const index = furniture.findIndex((item) => {
        const r = footprint(item);
        return (
          x >= r.minX - PICK_MARGIN && x <= r.maxX + PICK_MARGIN && z >= r.minZ - PICK_MARGIN && z <= r.maxZ + PICK_MARGIN
        );
      });
      if (index >= 0) return index;
    }
    return -1;
  }

  private onPointerMove(event: PointerEvent): void {
    this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    if (this.active && this.dragging && this.tool !== "hand") this.paint();
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.active || event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) return;
    this.onPointerMove(event);
    if (this.held) {
      this.dropHeld();
      return;
    }
    if (this.tool === "hand") {
      this.pickUp();
      return;
    }
    this.dragging = true;
    this.visited.clear();
    this.paint();
  }

  private pickUp(): void {
    const index = this.furnitureAt();
    if (index < 0) return;
    const { furniture } = this.plan.layout;
    const [item] = furniture.splice(index, 1);
    this.hold({ kind: item.kind, source: "moved", from: item, turn: item.turn });
    this.view.rebuild(this.plan);
  }

  /** Applies the tool once to whatever is under the pointer, skipping what this drag has already touched. */
  private paint(): void {
    if (!this.aimAt(0)) return;
    const { x, z } = this.floorPoint;
    const tileTool = this.tool === "floor" || this.tool === "sell";
    const spot = tileTool ? `${Math.floor(x)}:${Math.floor(z)}` : edgeAt(x, z);
    if (this.visited.has(spot)) return;
    this.visited.add(spot);
    if (this.tool === "floor") this.buyFloor(Math.floor(x), Math.floor(z));
    else if (this.tool === "sell") this.sellFloor(Math.floor(x), Math.floor(z));
    else if (this.tool === "wall") this.drawWall(spot);
    else if (this.tool === "unwall") this.removeWall(spot);
  }

  private buyFloor(col: number, row: number): void {
    if (!this.plan.canBuyTile(col, row)) return;
    if (this.host.gold() < TILE_COST) {
      this.say("Not enough gold.");
      return;
    }
    this.plan.buyTile(col, row);
    this.host.addGold(-TILE_COST);
    this.message = "";
    this.redraw();
  }

  private sellFloor(col: number, row: number): void {
    const problem = this.plan.sellProblem(col, row);
    if (problem) {
      this.say(problem);
      return;
    }
    const walls = this.plan.sellTile(col, row);
    this.host.addGold(refund(TILE_COST) + walls * refund(WALL_COST));
    this.message = "";
    this.redraw();
  }

  private drawWall(edge: string): void {
    const problem = this.plan.wallProblem(edge);
    if (problem) {
      this.say(problem);
      return;
    }
    if (this.host.gold() < WALL_COST) {
      this.say("Not enough gold.");
      return;
    }
    const { walls } = this.plan.layout;
    walls.push(edge);
    const blocked = this.host.routeProblem();
    if (blocked) {
      walls.pop();
      this.say(blocked);
      return;
    }
    this.host.addGold(-WALL_COST);
    this.message = "";
    this.redraw();
  }

  private removeWall(edge: string): void {
    const { walls } = this.plan.layout;
    const index = walls.indexOf(edge);
    if (index < 0) return;
    walls.splice(index, 1);
    this.host.addGold(refund(WALL_COST));
    this.message = "";
    this.redraw();
  }

  private showCursor(rect: Rect | null, color: number): void {
    this.cursor.visible = rect !== null;
    if (!rect) return;
    this.cursor.position.x = (rect.minX + rect.maxX) / 2;
    this.cursor.position.z = (rect.minZ + rect.maxZ) / 2;
    this.cursor.scale.set(rect.maxX - rect.minX, 1, rect.maxZ - rect.minZ);
    (this.cursorMaterial.color as Color).setHex(color);
  }

  private updateCursor(): void {
    const { held, plan } = this;
    if (held) {
      const item = this.heldPlacement();
      held.ghost.visible = item !== null;
      if (!item) {
        this.showCursor(null, GOOD);
        return;
      }
      held.ghost.position.set(item.x, 0, item.z);
      held.ghost.rotation.y = (item.turn * Math.PI) / 2;
      this.showCursor(footprint(item), plan.placeProblem(item, this.host.blockers()) ? BAD : GOOD);
      return;
    }
    if (this.tool === "hand") {
      const index = this.furnitureAt();
      this.showCursor(index >= 0 ? footprint(plan.layout.furniture[index]) : null, HOVER);
      return;
    }
    if (!this.aimAt(0)) {
      this.showCursor(null, GOOD);
      return;
    }
    const { x, z } = this.floorPoint;
    if (this.tool === "floor" || this.tool === "sell") {
      const [col, row] = [Math.floor(x), Math.floor(z)];
      const fine = this.tool === "floor" ? plan.canBuyTile(col, row) : plan.sellProblem(col, row) === null;
      this.showCursor({ minX: col, maxX: col + 1, minZ: row, maxZ: row + 1 }, fine ? GOOD : BAD);
      return;
    }
    const edge = edgeAt(x, z);
    const fine = this.tool === "wall" ? plan.wallProblem(edge) === null : plan.layout.walls.includes(edge);
    this.showCursor(edgeRect(edge), fine ? GOOD : BAD);
  }

  update(dt: number): void {
    const { input } = this;
    const step = PAN_SPEED * dt;
    const { minX, maxX, minZ, maxZ } = LOT_BOUNDS;
    this.focus.x = Math.min(maxX, Math.max(minX, this.focus.x + (Number(input.right) - Number(input.left)) * step));
    this.focus.z = Math.min(maxZ, Math.max(minZ, this.focus.z + (Number(input.down) - Number(input.up)) * step));
    if (input.pressed("KeyR")) this.rotate();
    if (input.pressed("KeyX") || input.pressed("Delete")) this.store();
    this.updateCursor();
  }
}
