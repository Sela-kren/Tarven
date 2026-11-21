import { describe, expect, it } from "vitest";
import { cupKeyMove } from "../src/game/appearance";

const key = (cup: number, value: number) => ({ cup, delta: new Float32Array([value, 0, 0]) });

describe("cup keys", () => {
  const keys = [key(-1, -10), key(0.25, 4), key(1, 20)];
  const at = (cup: number) => {
    const total = new Float32Array(3);
    cupKeyMove(keys, cup, total);
    return total[0];
  };

  it("shows each key exactly at its own cup, and nothing at C", () => {
    expect(at(-1)).toBeCloseTo(-10);
    expect(at(0)).toBeCloseTo(0);
    expect(at(0.25)).toBeCloseTo(4);
    expect(at(1)).toBeCloseTo(20);
  });

  it("blends between the keys either side", () => {
    expect(at(-0.5)).toBeCloseTo(-5);
    expect(at(0.125)).toBeCloseTo(2);
    expect(at(0.625)).toBeCloseTo(12);
  });

  it("holds the end keys past them", () => {
    expect(at(1.5)).toBeCloseTo(20);
    expect(at(-2)).toBeCloseTo(-10);
  });
});
