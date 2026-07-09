import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import apiRouter from "./api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build the Express application. Kept separate from server.js so tests can drive
 * the app with supertest without opening a socket.
 */
export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "catbook-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax" },
    })
  );

  app.use("/api", apiRouter);

  // Serve the built React client if present (production / `npm run build`).
  const clientDist = path.resolve(__dirname, "../dist/client");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  // Central error handler so thrown async errors become clean JSON 500s.
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error("[server error]", err);
    res.status(500).json({ error: err.message || "internal error" });
  });

  return app;
}
