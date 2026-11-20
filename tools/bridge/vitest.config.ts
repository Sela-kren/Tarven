import { defineConfig } from "vitest/config";

// The Blender bridge's server (server.preview.ts). Not a test: `npm run bridge` serves until stopped.
export default defineConfig({
  test: {
    include: ["tools/bridge/server.preview.ts"],
    testTimeout: 2 ** 31 - 1,
  },
});
