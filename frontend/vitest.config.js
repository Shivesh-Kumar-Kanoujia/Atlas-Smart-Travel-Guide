import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    include: ["./tests/**/*.test.{js,jsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@components": path.resolve(__dirname, "components"),
      "@lib": path.resolve(__dirname, "lib"),
    },
  },
});
