import { defineConfig } from "vitest/config";
// Her face keys in the game against the old rig (facekeyscheck.preview.ts). Not a test.
export default defineConfig({ test: { include: ["tools/bridge/facekeyscheck.preview.ts"], testTimeout: 1800000 } });
