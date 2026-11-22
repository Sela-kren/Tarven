import { defineConfig } from "vitest/config";
// A packed model against the one it came from (glbpackcheck.preview.ts). Not a test.
export default defineConfig({ test: { include: ["tools/bridge/glbpackcheck.preview.ts"], testTimeout: 3600000 } });
