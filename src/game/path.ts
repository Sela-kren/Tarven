import type { Rect, Vec2 } from "./collision";

const CELL = 0.2;

function distanceToRect(x: number, z: number, r: Rect): number {
  const dx = x - Math.min(Math.max(x, r.minX), r.maxX);
  const dz = z - Math.min(Math.max(z, r.minZ), r.maxZ);
  return Math.hypot(dx, dz);
}

/** Finds walking routes for guests around the furniture. */
export class NavGrid {
  private readonly cols: number;
  private readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(rects: readonly Rect[], clearance: number, private readonly bounds: Rect) {
    this.cols = Math.ceil((bounds.maxX - bounds.minX) / CELL);
    this.rows = Math.ceil((bounds.maxZ - bounds.minZ) / CELL);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const { x, z } = this.centre(col + row * this.cols);
        if (rects.some((r) => distanceToRect(x, z, r) < clearance)) {
          this.blocked[col + row * this.cols] = 1;
        }
      }
    }
  }

  private centre(cell: number): Vec2 {
    const col = cell % this.cols;
    const row = (cell - col) / this.cols;
    return { x: this.bounds.minX + (col + 0.5) * CELL, z: this.bounds.minZ + (row + 0.5) * CELL };
  }

  private cellAt(p: Vec2): number {
    const col = Math.min(this.cols - 1, Math.max(0, Math.floor((p.x - this.bounds.minX) / CELL)));
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor((p.z - this.bounds.minZ) / CELL)));
    return col + row * this.cols;
  }

  private neighbours(cell: number): number[] {
    const col = cell % this.cols;
    const out: number[] = [];
    if (col > 0) out.push(cell - 1);
    if (col < this.cols - 1) out.push(cell + 1);
    if (cell >= this.cols) out.push(cell - this.cols);
    if (cell < this.cols * (this.rows - 1)) out.push(cell + this.cols);
    return out;
  }

  /** The closest walkable cell, for points that land on or against furniture. */
  private nearestFree(start: number): number | null {
    if (!this.blocked[start]) return start;
    const seen = new Set([start]);
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      for (const next of this.neighbours(queue[head])) {
        if (seen.has(next)) continue;
        if (!this.blocked[next]) return next;
        seen.add(next);
        queue.push(next);
      }
    }
    return null;
  }

  private hasClearLine(a: Vec2, b: Vec2): boolean {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL / 2));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      if (this.blocked[this.cellAt({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })]) return false;
    }
    return true;
  }

  private smooth(points: Vec2[]): Vec2[] {
    const out = [points[0]];
    let anchor = 0;
    while (anchor < points.length - 1) {
      let next = points.length - 1;
      while (next > anchor + 1 && !this.hasClearLine(points[anchor], points[next])) next--;
      out.push(points[next]);
      anchor = next;
    }
    return out;
  }

  /** Waypoints from one place to another, or null if there is no way through. */
  findPath(from: Vec2, to: Vec2): Vec2[] | null {
    const start = this.nearestFree(this.cellAt(from));
    const goal = this.nearestFree(this.cellAt(to));
    if (start === null || goal === null) return null;

    const parent = new Int32Array(this.blocked.length).fill(-1);
    parent[start] = start;
    const queue = [start];
    for (let head = 0; head < queue.length && parent[goal] === -1; head++) {
      for (const next of this.neighbours(queue[head])) {
        if (parent[next] !== -1 || this.blocked[next]) continue;
        parent[next] = queue[head];
        queue.push(next);
      }
    }
    if (parent[goal] === -1) return null;

    const cells = [goal];
    while (cells[cells.length - 1] !== start) cells.push(parent[cells[cells.length - 1]]);
    return this.smooth(cells.reverse().map((cell) => this.centre(cell)));
  }
}
