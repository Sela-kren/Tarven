import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The tests run on fixed guest lists, not the real nights' pacing (tests/setup.ts).
    setupFiles: ["tests/setup.ts"],
    // Agent worktrees hold their own copies of the tests; only this checkout's run.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
});
