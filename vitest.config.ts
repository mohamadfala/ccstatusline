import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      include: ["src/segments/**", "src/themes/**", "src/core/**"],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 }
    }
  }
});
