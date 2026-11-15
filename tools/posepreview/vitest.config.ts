import { defineConfig } from "vitest/config";

// Renders the fight picture's poses off screen, for checking them by eye (see render.preview.ts). Not a test:
// run it with `npx vitest run --config tools/posepreview/vitest.config.ts`.
export default defineConfig({
  test: {
    include: [process.env.ONLY ?? "tools/posepreview/*.preview.ts"],
    testTimeout: 600_000,
  },
});
