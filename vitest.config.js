import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest runs two kinds of suites:
//  - API/socket integration tests (Node env, real Express app + in-memory MongoDB)
//  - React component tests (jsdom env, React Testing Library)
// environmentMatchGlobs selects the right environment per file.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["**/*.test.jsx", "jsdom"],
      ["tests/components.test.jsx", "jsdom"],
    ],
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    testTimeout: 60000,
    hookTimeout: 120000,
    pool: "forks",
    fileParallelism: false,
  },
});
