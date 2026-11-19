import { defineConfig } from "vitest/config";

// Her expressions written out for Blender (expressions.preview.ts). Not a test.
export default defineConfig({
  test: {
    include: ["tools/facepreview/expressions.preview.ts"],
    testTimeout: 600_000,
  },
});
