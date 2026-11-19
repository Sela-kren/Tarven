import { defineConfig } from "vitest/config";

// The ref compare's game render (game.preview.ts), run by compare.py. Not a test.
export default defineConfig({
  test: {
    include: ["tools/refcompare/game.preview.ts"],
    testTimeout: 600_000,
  },
});
