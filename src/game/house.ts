/**
 * The rules of the building plan: which floor tiles you own, where walls stand, where the furniture is and
 * what's in storage. No drawing here, so all of it can be tested.
 *
 * Tiles are 1m squares on whole-number coordinates: tile (col, row) covers x from col to col+1 and z from
 * row to row+1. An edge between two tiles is named by the line it lies on: "h:c:r" runs east-west along z=r
 * from x=c to c+1, and "v:c:r" runs north-south along x=c from z=r to r+1.
 */
import type { Rect } from "./collision";

export const FURNITURE_KINDS = ["chair", "stool", "longTable", "roundTable"] as const;
export type FurnitureKind = (typeof FURNITURE_KINDS)[number];

export interface Placed {
  kind: FurnitureKind;
  x: number;
  z: number;
  /** Quarter turns, 0 to 3. */
  turn: number;
}

/** What gets saved. */
export interface HouseLayout {
  /** Tiles bought beyond the original building, as [col, row]. */
  tiles: [number, number][];
  /** Walls drawn inside the house, by edge name. */
  walls: string[];
  furniture: Placed[];
  /** Furniture you own that isn't placed anywhere. */
  stored: FurnitureKind[];
}

export const FURNITURE_NAMES: Record<FurnitureKind, string> = {
  chair: "Chair",
  stool: "Stool",
  longTable: "Long table",
  roundTable: "Round table",
};
export const FURNITURE_PRICES: Record<FurnitureKind, number> = { chair: 6, stool: 4, longTable: 15, roundTable: 12 };
export const TILE_COST = 2;
export const WALL_COST = 1;
/** Selling something back returns this share of its price, rounded down. */
export const REFUND_SHARE = 0.5;
/** The fewest seats the tavern can open with. */
export const MIN_SEATS = 4;
export const refund = (price: number): number => Math.floor(price * REFUND_SHARE);

/** How far furniture reaches from its middle, at turn 0. */
const FOOTPRINT: Record<FurnitureKind, { x: number; z: number }> = {
  chair: { x: 0.23, z: 0.23 },
  stool: { x: 0.18, z: 0.18 },
  longTable: { x: 0.85, z: 0.475 },
  roundTable: { x: 0.72, z: 0.72 },
};

/** The most land the plan can cover, inclusive. North of the first row is the street. */
const LOT = { minCol: -13, maxCol: 13, minRow: -5, maxRow: 10 };
export const LOT_BOUNDS: Rect = { minX: LOT.minCol, maxX: LOT.maxCol + 1, minZ: LOT.minRow, maxZ: LOT.maxRow + 1 };
const CORE = { minCol: -7, maxCol: 6, minRow: -5, maxRow: 4 };
/** Along the east side, the rows up to here belong to the bedroom and the wall its door is cut through. */
const EAST_WING_LAST_RESERVED_ROW = 2;
/** The strip behind the chimney, which has to stay a wall. */
const CHIMNEY = { col: -8, minRow: -2, maxRow: 0 };

export const OUTER_WALL = 0.4;
const DRAWN_WALL = 0.2;
export const WALL_HEIGHT = 3.2;
/** Walls facing the camera stay low, as the tavern's south wall does, so they never hide anyone. */
export const SILL_HEIGHT = 0.35;
const DRAWN_EAST_WEST_HEIGHT = 0.5;
const DRAWN_NORTH_SOUTH_HEIGHT = 1.2;

/** The bar's top, and how close a stool has to be to it. */
const BAR: Rect = { minX: 0.825, maxX: 5.575, minZ: -3.33, maxZ: -2.47 };
const BAR_Z = -2.9;
/** How far a seat can be from a table's edge and still be at the table. */
const SEAT_REACH = 0.55;

export interface WallPiece {
  rect: Rect;
  height: number;
}

export interface SeatSpec {
  kind: FurnitureKind;
  x: number;
  z: number;
  /** The point the sitter faces. */
  targetX: number;
  targetZ: number;
  atBar: boolean;
  /** The table's name, or "Bar". */
  table: string;
}

const key = (col: number, row: number) => `${col}:${row}`;
const isTable = (kind: FurnitureKind) => kind === "longTable" || kind === "roundTable";

export function emptyLayout(furniture: Placed[] = []): HouseLayout {
  return { tiles: [], walls: [], furniture, stored: [] };
}

export function cloneLayout(layout: HouseLayout): HouseLayout {
  return {
    tiles: layout.tiles.map(([col, row]) => [col, row]),
    walls: [...layout.walls],
    furniture: layout.furniture.map((item) => ({ ...item })),
    stored: [...layout.stored],
  };
}

export function footprint(item: Placed): Rect {
  const { x, z } = FOOTPRINT[item.kind];
  const [halfX, halfZ] = item.turn % 2 === 0 ? [x, z] : [z, x];
  return { minX: item.x - halfX, maxX: item.x + halfX, minZ: item.z - halfZ, maxZ: item.z + halfZ };
}

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

const gapTo = (x: number, z: number, r: Rect): number =>
  Math.hypot(x - Math.min(Math.max(x, r.minX), r.maxX), z - Math.min(Math.max(z, r.minZ), r.maxZ));

/** What a chair or stool here would be sitting at, or null if it's out on its own. */
function seatTarget(item: Placed, furniture: readonly Placed[]): Omit<SeatSpec, "kind" | "x" | "z"> | null {
  let best: Omit<SeatSpec, "kind" | "x" | "z"> | null = null;
  let bestGap = SEAT_REACH;
  furniture.forEach((other, index) => {
    if (!isTable(other.kind)) return;
    const gap = gapTo(item.x, item.z, footprint(other));
    if (gap <= bestGap) {
      bestGap = gap;
      best = { targetX: other.x, targetZ: other.z, atBar: false, table: `Table ${index}` };
    }
  });
  // Only the customers' side of the bar: behind it is where you work.
  const barGap = gapTo(item.x, item.z, BAR);
  if (item.z > BAR.maxZ && barGap <= bestGap) best = { targetX: item.x, targetZ: BAR_Z, atBar: true, table: "Bar" };
  return best;
}

/** Every usable seat, in furniture order, which keeps seat numbers the same for the same layout. */
export function seatSpecs(furniture: readonly Placed[]): SeatSpec[] {
  return furniture.flatMap((item) => {
    if (isTable(item.kind)) return [];
    const target = seatTarget(item, furniture);
    return target ? [{ kind: item.kind, x: item.x, z: item.z, ...target }] : [];
  });
}

/** Turns a chair or stool to face what it's at. Anything else, or a seat at nothing, stays as it is. */
export function faceTable(item: Placed, furniture: readonly Placed[]): number {
  if (isTable(item.kind)) return item.turn;
  const target = seatTarget(item, furniture);
  if (!target) return item.turn;
  const heading = Math.atan2(-(target.targetX - item.x), -(target.targetZ - item.z));
  return ((Math.round(heading / (Math.PI / 2)) % 4) + 4) % 4;
}

/** The edge nearest a point on the floor. */
export function edgeAt(x: number, z: number): string {
  const offX = Math.abs(x - Math.round(x));
  const offZ = Math.abs(z - Math.round(z));
  return offZ <= offX ? `h:${Math.floor(x)}:${Math.round(z)}` : `v:${Math.round(x)}:${Math.floor(z)}`;
}

function parseEdge(edge: string): { horizontal: boolean; col: number; row: number } {
  const [axis, col, row] = edge.split(":");
  return { horizontal: axis === "h", col: Number(col), row: Number(row) };
}

export function edgeRect(edge: string): Rect {
  const { horizontal, col, row } = parseEdge(edge);
  const half = DRAWN_WALL / 2;
  return horizontal
    ? { minX: col, maxX: col + 1, minZ: row - half, maxZ: row + half }
    : { minX: col - half, maxX: col + half, minZ: row, maxZ: row + 1 };
}

const isCore = (col: number, row: number) =>
  col >= CORE.minCol && col <= CORE.maxCol && row >= CORE.minRow && row <= CORE.maxRow;

const isBedroomSide = (col: number, row: number) => col > CORE.maxCol && row <= EAST_WING_LAST_RESERVED_ROW;

const isReserved = (col: number, row: number) =>
  isBedroomSide(col, row) || (col === CHIMNEY.col && row >= CHIMNEY.minRow && row <= CHIMNEY.maxRow);

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** A layout, with the questions the build tools ask of it. Changes go straight into `layout`. */
export class HousePlan {
  private readonly bought = new Set<string>();

  constructor(readonly layout: HouseLayout) {
    for (const [col, row] of layout.tiles) this.bought.add(key(col, row));
  }

  isOwned(col: number, row: number): boolean {
    return isCore(col, row) || this.bought.has(key(col, row));
  }

  private touchesOwned(col: number, row: number): boolean {
    return NEIGHBOURS.some(([dc, dr]) => this.isOwned(col + dc, row + dr));
  }

  canBuyTile(col: number, row: number): boolean {
    const inLot = col >= LOT.minCol && col <= LOT.maxCol && row >= LOT.minRow && row <= LOT.maxRow;
    return inLot && !this.isOwned(col, row) && !isReserved(col, row) && this.touchesOwned(col, row);
  }

  buyTile(col: number, row: number): void {
    this.bought.add(key(col, row));
    this.layout.tiles.push([col, row]);
  }

  /** Every tile that could be bought now. */
  buyableTiles(): [number, number][] {
    const tiles: [number, number][] = [];
    for (let row = LOT.minRow; row <= LOT.maxRow; row++) {
      for (let col = LOT.minCol; col <= LOT.maxCol; col++) if (this.canBuyTile(col, row)) tiles.push([col, row]);
    }
    return tiles;
  }

  /** Why a tile can't be sold, or null if it can. */
  sellProblem(col: number, row: number): string | null {
    if (!this.bought.has(key(col, row))) return "You can only sell floor you bought.";
    const tile: Rect = { minX: col, maxX: col + 1, minZ: row, maxZ: row + 1 };
    if (this.layout.furniture.some((item) => overlaps(footprint(item), tile))) return "Move the furniture off it first.";
    if (!this.staysConnected(col, row)) return "That would cut off the floor beyond it.";
    return null;
  }

  private staysConnected(col: number, row: number): boolean {
    const removed = key(col, row);
    const remaining = [...this.bought].filter((tile) => tile !== removed);
    const seen = new Set<string>();
    const queue: [number, number][] = remaining
      .map((tile): [number, number] => {
        const [c, r] = tile.split(":").map(Number);
        return [c, r];
      })
      .filter(([c, r]) => NEIGHBOURS.some(([dc, dr]) => isCore(c + dc, r + dr)));
    queue.forEach(([c, r]) => seen.add(key(c, r)));
    while (queue.length > 0) {
      const [c, r] = queue.pop() as [number, number];
      for (const [dc, dr] of NEIGHBOURS) {
        const next = key(c + dc, r + dr);
        if (next !== removed && this.bought.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push([c + dc, r + dr]);
        }
      }
    }
    return seen.size === remaining.length;
  }

  /** Removes the tile and any walls drawn along it, returning how many walls went with it. */
  sellTile(col: number, row: number): number {
    this.bought.delete(key(col, row));
    const { layout } = this;
    layout.tiles = layout.tiles.filter(([c, r]) => c !== col || r !== row);
    const kept = layout.walls.filter((edge) => this.wallSidesOwned(edge));
    const removed = layout.walls.length - kept.length;
    layout.walls = kept;
    return removed;
  }

  private wallSidesOwned(edge: string): boolean {
    const { horizontal, col, row } = parseEdge(edge);
    return horizontal
      ? this.isOwned(col, row - 1) && this.isOwned(col, row)
      : this.isOwned(col - 1, row) && this.isOwned(col, row);
  }

  /** Why a wall can't go along this edge, or null if it can. */
  wallProblem(edge: string): string | null {
    if (this.layout.walls.includes(edge)) return "There's already a wall there.";
    if (!this.wallSidesOwned(edge)) return "Walls go between two floor tiles you own.";
    const rect = edgeRect(edge);
    if (this.layout.furniture.some((item) => overlaps(footprint(item), rect))) return "Furniture is in the way.";
    return null;
  }

  /** Why this piece can't stand here, or null if it can. `ignore` is its own index when it's being moved. */
  placeProblem(item: Placed, blockers: readonly Rect[], ignore = -1): string | null {
    const rect = footprint(item);
    for (let row = Math.floor(rect.minZ); row < Math.ceil(rect.maxZ); row++) {
      for (let col = Math.floor(rect.minX); col < Math.ceil(rect.maxX); col++) {
        if (!this.isOwned(col, row)) return "That needs to be on your floor.";
      }
    }
    const inTheWay =
      blockers.some((blocker) => overlaps(rect, blocker)) ||
      this.layout.walls.some((edge) => overlaps(rect, edgeRect(edge))) ||
      this.layout.furniture.some((other, index) => index !== ignore && overlaps(rect, footprint(other)));
    return inTheWay ? "Something's in the way." : null;
  }

  /** The walls around the owned floor. Part of the original north and east walls never changes, so isn't here. */
  outerWalls(): WallPiece[] {
    const pieces: WallPiece[] = [];
    const add = (rect: Rect, height: number) => pieces.push({ rect, height });
    const tiles: [number, number][] = [...this.layout.tiles];
    for (let row = CORE.minRow; row <= CORE.maxRow; row++) {
      for (let col = CORE.minCol; col <= CORE.maxCol; col++) tiles.push([col, row]);
    }

    for (const [col, row] of tiles) {
      // East-west walls run on past an outside corner, so the corner is closed.
      const minX = this.isOwned(col - 1, row) ? col : col - OUTER_WALL;
      const maxX = this.isOwned(col + 1, row) ? col + 1 : col + 1 + OUTER_WALL;

      if (!this.isOwned(col, row - 1) && !(isCore(col, row) && row === CORE.minRow)) {
        // Rooms behind the bedroom would stand in front of it, so that side stays low.
        add({ minX, maxX, minZ: row - OUTER_WALL, maxZ: row }, isBedroomSide(col, row - 1) ? SILL_HEIGHT : WALL_HEIGHT);
      }
      if (!this.isOwned(col, row + 1)) add({ minX, maxX, minZ: row + 1, maxZ: row + 1 + OUTER_WALL }, SILL_HEIGHT);
      if (!this.isOwned(col - 1, row)) {
        add({ minX: col - OUTER_WALL, maxX: col, minZ: row, maxZ: row + 1 }, WALL_HEIGHT);
      }
      if (!this.isOwned(col + 1, row) && !(col === CORE.maxCol && row <= EAST_WING_LAST_RESERVED_ROW)) {
        add({ minX: col + 1, maxX: col + 1 + OUTER_WALL, minZ: row, maxZ: row + 1 }, WALL_HEIGHT);
      }
    }
    return pieces;
  }

  drawnWalls(): WallPiece[] {
    return this.layout.walls.map((edge) => ({
      rect: edgeRect(edge),
      height: parseEdge(edge).horizontal ? DRAWN_EAST_WEST_HEIGHT : DRAWN_NORTH_SOUTH_HEIGHT,
    }));
  }

  /** The smallest rectangle around the tavern floor and everything bought. */
  bounds(): Rect {
    const rect: Rect = { minX: CORE.minCol, maxX: CORE.maxCol + 1, minZ: CORE.minRow, maxZ: CORE.maxRow + 1 };
    for (const [col, row] of this.layout.tiles) {
      rect.minX = Math.min(rect.minX, col);
      rect.maxX = Math.max(rect.maxX, col + 1);
      rect.minZ = Math.min(rect.minZ, row);
      rect.maxZ = Math.max(rect.maxZ, row + 1);
    }
    return rect;
  }
}

/** True if this looks like a layout a save could hold. */
export function isHouseLayout(raw: unknown): raw is HouseLayout {
  if (!raw || typeof raw !== "object") return false;
  const layout = raw as Partial<HouseLayout>;
  const isKind = (value: unknown) => FURNITURE_KINDS.includes(value as FurnitureKind);
  return (
    Array.isArray(layout.tiles) &&
    layout.tiles.every((tile) => Array.isArray(tile) && tile.length === 2 && tile.every(Number.isInteger)) &&
    Array.isArray(layout.walls) &&
    layout.walls.every((edge) => typeof edge === "string" && /^[hv]:-?\d+:-?\d+$/.test(edge)) &&
    Array.isArray(layout.furniture) &&
    layout.furniture.every(
      (item) =>
        isKind(item?.kind) && Number.isFinite(item.x) && Number.isFinite(item.z) && Number.isInteger(item.turn),
    ) &&
    Array.isArray(layout.stored) &&
    layout.stored.every(isKind)
  );
}
