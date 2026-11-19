import { defineConfig } from "vitest/config";

// Turns an RGB MoCap face export into her face (convert.preview.ts). Not a test: see tools/facecap/README.md.
export default defineConfig({
  test: {
    include: ["tools/facecap/convert.preview.ts"],
    testTimeout: 600_000,
  },
});
