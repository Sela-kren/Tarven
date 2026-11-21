import { defineConfig } from "vitest/config";
// Bakes her face shape keys from the old rig (facebake.preview.ts). Not a test.
export default defineConfig({ test: { include: ["tools/bridge/facebake.preview.ts"], testTimeout: 1800000 } });
