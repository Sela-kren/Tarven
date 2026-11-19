import { defineConfig } from "vitest/config";

// Fits an expression's numbers to a Blender edit (fit.preview.ts). Not a test.
export default defineConfig({
  test: {
    include: ["tools/facepreview/fit.preview.ts"],
    testTimeout: 600_000,
  },
});
