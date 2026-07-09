import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Client dev server + production build config.
// The API + Socket.io backend runs separately (server/server.js) and is proxied
// during development so the SPA can talk to it without CORS issues.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "../dist/client"),
    emptyOutDir: true,
  },
});
