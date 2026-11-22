import { defineConfig } from "vitest/config";
// Checks her crotch keys against the model as the game shapes her (crotchkeyscheck.preview.ts). Not a test.
export default defineConfig({ test: { include: ["tools/bridge/crotchkeyscheck.preview.ts"], testTimeout: 1800000 } });
