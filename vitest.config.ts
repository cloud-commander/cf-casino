import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Defines a workspace to split Backend (Edge) and Frontend (JSDOM) logic
    projects: [
      {
        test: {
          name: "backend (edge logic)",
          // Simulates the actual constrained CF Worker environment to catch
          // Node.js specific bugs (e.g., trying to use 'fs' or 'crypto' improperly)
          environment: "node", // approx for miniflare
          include: ["src/backend/**/*.test.ts"],
          alias: {
            "@shared": path.resolve(__dirname, "./src/shared"),
          },
        },
      },
      {
        test: {
          name: "frontend (react dom)",
          // Mounts React components using JSDOM for UI State tests
          environment: "jsdom",
          include: ["frontend/src/**/*.test.{ts,tsx}"],
          alias: {
            "@": path.resolve(__dirname, "./frontend/src"),
            "@shared": path.resolve(__dirname, "./src/shared"),
          },
        },
      },
      {
        test: {
          name: "shared (pure logic)",
          environment: "node",
          include: ["src/shared/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: ["node_modules", "docs", ".wrangler", "migrations"],
    },
  },
});
