import http from "http";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./db.js";
import { initSocket } from "./socket.js";

/**
 * Boot the full stack: connect the database, build the Express app, attach
 * Socket.io, and start listening. Returns a handle so callers (and the smoke
 * test) can shut it down cleanly.
 */
export async function startServer({ port = process.env.PORT || 3000, uri } = {}) {
  const dbInfo = await connectDb(uri);
  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);

  await new Promise((resolve) => server.listen(port, resolve));
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  async function close() {
    io.close();
    await new Promise((resolve) => server.close(resolve));
    await disconnectDb();
  }

  return { app, server, io, port: actualPort, db: dbInfo, close };
}

// Run directly:  node server/server.js
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startServer()
    .then(({ port, db }) => {
      // eslint-disable-next-line no-console
      console.log(
        `[catbook] listening on http://localhost:${port}  (db: ${
          db.inMemory ? "in-memory MongoDB" : db.uri
        })`
      );
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[catbook] failed to start:", err);
      process.exit(1);
    });
}
