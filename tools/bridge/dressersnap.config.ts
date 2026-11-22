import { defineConfig } from "vitest/config";
// A fingerprint of what the Dresser makes of her (dressersnap.preview.ts). Not a test.
export default defineConfig({ test: { include: ["tools/bridge/dressersnap.preview.ts"], testTimeout: 3600000 } });
