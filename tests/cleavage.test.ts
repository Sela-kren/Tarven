import { describe, expect, it } from "vitest";
import { cleavageHold, clothSpan, spanCleavage } from "../src/game/appearance";

// Model space: x across, y up, z backwards. Two breasts at chest height, 15 cm forward at x = ±7 cm, and the skin
// between them 8 cm forward 2 cm off the middle; one point on her back, which never holds anything out.
const body = new Float32Array([
  -0.07, 1.1, -0.15,
  0.07, 1.1, -0.15,
  -0.02, 1.1, -0.08,
  0.02, 1.1, -0.08,
  0.07, 1.1, 0.1,
]);
// Cloth in the cleavage (1 cm off the skin there), over a breast's outer side, and on her back.
const cloth = new Float32Array([
  0, 1.1, -0.09,
  0.1, 1.1, -0.12,
  0, 1.1, 0.12,
]);

/** The body grown: each breast 5 cm further forward, the skin between them where it was. */
function grown(): Float32Array {
  const moves = new Float32Array(body.length);
  moves[2] = -0.05;
  moves[5] = -0.05;
  return moves;
}

describe("clothes over the cleavage", () => {
  it("holds out on the front of the chest only", () => {
    expect(Array.from(cleavageHold(body).at)).toEqual([0, 1, 2, 3]);
  });

  it("stretches across as the breasts grow forward, keeping how far it dipped as built and a little more", () => {
    const hold = cleavageHold(body);
    const span = clothSpan(hold, cloth)!;
    expect(Array.from(span.verts)).toEqual([0, 1]);
    // Built, it lay 6 cm behind the 15 cm span.
    expect(span.sunk[0]).toBeCloseTo(0.06);
    const moves = new Float32Array(cloth.length);
    spanCleavage(hold, span, cloth, moves, grown());
    // Now the span is 20 cm forward: 11 cm behind it, it keeps its 6 cm and a fifth of the 5 cm more.
    expect(moves[2]).toBeCloseTo(-0.04);
    expect(moves[0]).toBe(0);
    expect(moves[1]).toBe(0);
  });

  it("leaves points past the breasts, on her back, or on an unchanged body alone", () => {
    const hold = cleavageHold(body);
    const span = clothSpan(hold, cloth)!;
    const moves = new Float32Array(cloth.length);
    spanCleavage(hold, span, cloth, moves, grown());
    expect(Array.from(moves.subarray(3))).toEqual([0, 0, 0, 0, 0, 0]);
    const still = new Float32Array(cloth.length);
    spanCleavage(hold, span, cloth, still, new Float32Array(body.length));
    expect(Array.from(still)).toEqual(new Array(cloth.length).fill(0));
  });

  it("never pulls cloth already in front of the span back", () => {
    const hold = cleavageHold(body);
    const front = new Float32Array([0, 1.1, -0.18]);
    const span = clothSpan(hold, front)!;
    expect(span.sunk[0]).toBe(0);
    const moves = new Float32Array(3);
    spanCleavage(hold, span, front, moves, new Float32Array(body.length));
    expect(moves[2]).toBe(0);
  });
});
