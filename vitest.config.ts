import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": dirname(fileURLToPath(import.meta.url)) } },
  esbuild: { jsx: "automatic" },
});
