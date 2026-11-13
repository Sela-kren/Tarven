import { describe, expect, it } from "vitest";
import { GIVE_IN_TEXTS, IMPULSE_LINES } from "../src/game/touchtalk-givein";
import { TOUCHES } from "../src/game/touchtalk";

describe("giving in", () => {
  it("has several lines for each touch, for a real touch, so it doesn't read the same twice", () => {
    for (const [id, lines] of Object.entries(GIVE_IN_TEXTS)) {
      expect(TOUCHES.some((t) => t.id === id), id).toBe(true);
      expect(lines.length, id).toBeGreaterThanOrEqual(2);
      expect(new Set(lines).size, id).toBe(lines.length);
      for (const line of lines) expect(line.trim().length, id).toBeGreaterThan(0);
    }
  });

  it("only uses {piece} on touches that take a garment", () => {
    for (const [id, lines] of Object.entries(GIVE_IN_TEXTS)) {
      const strip = TOUCHES.find((t) => t.id === id)?.strip ?? false;
      if (!strip) for (const line of lines) expect(line, id).not.toContain("{piece}");
    }
  });

  it("has more than one impulse line", () => {
    expect(IMPULSE_LINES.length).toBeGreaterThan(1);
  });
});
