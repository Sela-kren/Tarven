export interface Vec2 {
  x: number;
  z: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Pushes a circle out of every rectangle it overlaps, so it slides along walls. */
export function resolveCircle(pos: Vec2, radius: number, rects: readonly Rect[], iterations = 3): Vec2 {
  let { x, z } = pos;
  for (let i = 0; i < iterations; i++) {
    let moved = false;
    for (const r of rects) {
      const nearestX = Math.min(Math.max(x, r.minX), r.maxX);
      const nearestZ = Math.min(Math.max(z, r.minZ), r.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radius * radius) continue;
      moved = true;

      if (distSq > 1e-10) {
        const dist = Math.sqrt(distSq);
        x = nearestX + (dx / dist) * radius;
        z = nearestZ + (dz / dist) * radius;
        continue;
      }

      // Centre is inside the rectangle: leave through the closest side.
      const exits = [
        { d: x - r.minX, x: r.minX - radius, z },
        { d: r.maxX - x, x: r.maxX + radius, z },
        { d: z - r.minZ, x, z: r.minZ - radius },
        { d: r.maxZ - z, x, z: r.maxZ + radius },
      ];
      const best = exits.reduce((a, b) => (b.d < a.d ? b : a));
      x = best.x;
      z = best.z;
    }
    if (!moved) break;
  }
  return { x, z };
}

/** Turns held directions into a vector of length 0 or 1, so diagonals are not faster. */
export function moveVector(left: boolean, right: boolean, up: boolean, down: boolean): Vec2 {
  const x = Number(right) - Number(left);
  const z = Number(down) - Number(up);
  const length = Math.hypot(x, z);
  return length === 0 ? { x: 0, z: 0 } : { x: x / length, z: z / length };
}
