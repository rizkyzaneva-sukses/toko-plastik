import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  // import.meta.dirname, bukan __dirname — file ini ESM (.mts).
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
