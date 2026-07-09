/**
 * Headless end-to-end smoke test.
 *
 * Boots the real server (Express + Socket.io + in-memory MongoDB), then drives
 * the actual HTTP API and a live websocket exactly as a browser would, printing
 * every step and writing machine-readable evidence to results/.
 *
 *   node scripts/smoke.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { io as ioClient } from "socket.io-client";
import { startServer } from "../server/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.resolve(__dirname, "../results");
fs.mkdirSync(resultsDir, { recursive: true });

const log = [];
function step(msg, data) {
  const line = data === undefined ? msg : `${msg} ${JSON.stringify(data)}`;
  log.push(line);
  // eslint-disable-next-line no-console
  console.log(line);
}

async function main() {
  const evidence = { startedAt: new Date().toISOString(), steps: [] };
  const handle = await startServer({ port: 0 });
  const base = `http://localhost:${handle.port}`;
  step(`server up on ${base} (db: ${handle.db.inMemory ? "in-memory MongoDB" : handle.db.uri})`);

  let cookie = "";
  async function api(method, endpoint, body) {
    const res = await fetch(base + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookies = res.headers.getSetCookie?.() || [];
    if (setCookies.length) cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // ---- REST flow ----
    let r = await api("GET", "/api/whoami");
    step("GET /api/whoami (logged out) ->", r.status);
    evidence.steps.push({ name: "whoami-logged-out", status: r.status, ok: r.status === 200 });

    r = await api("POST", "/api/login", { name: "Ada Lovelace" });
    const user = r.body;
    step("POST /api/login ->", { status: r.status, user });
    evidence.steps.push({ name: "login", status: r.status, ok: r.status === 200 && !!user._id });

    r = await api("POST", "/api/story", { content: "Hello from the smoke test!" });
    const story = r.body;
    step("POST /api/story ->", { status: r.status, id: story._id, content: story.content });
    evidence.steps.push({ name: "create-story", status: r.status, ok: r.status === 200 });

    r = await api("POST", "/api/like", { storyId: story._id, liked: true });
    step("POST /api/like (like) ->", { status: r.status, likeCount: r.body.likeCount });
    evidence.steps.push({ name: "like", status: r.status, ok: r.body.likeCount === 1 });

    r = await api("POST", "/api/comment", { parent: story._id, content: "First!" });
    step("POST /api/comment ->", { status: r.status, content: r.body.content });
    evidence.steps.push({ name: "comment", status: r.status, ok: r.status === 200 });

    r = await api("GET", `/api/comment?parent=${story._id}`);
    step("GET /api/comment ->", { status: r.status, count: r.body.length });
    evidence.steps.push({ name: "list-comments", status: r.status, ok: r.body.length === 1 });

    r = await api("GET", "/api/stories");
    step("GET /api/stories ->", { status: r.status, count: r.body.length, topLikes: r.body[0].likeCount });
    evidence.steps.push({ name: "list-stories", status: r.status, ok: r.body.length === 1 });

    r = await api("GET", "/api/profile/stories");
    step("GET /api/profile/stories ->", { status: r.status, count: r.body.length });
    evidence.steps.push({ name: "profile", status: r.status, ok: r.body.length === 1 });

    // ---- Socket.io real-time flow ----
    const clientA = ioClient(base, { transports: ["websocket"], forceNew: true });
    const clientB = ioClient(base, { transports: ["websocket"], forceNew: true });
    await Promise.all([
      new Promise((res) => clientA.on("connect", res)),
      new Promise((res) => clientB.on("connect", res)),
    ]);
    step("two websocket clients connected");

    clientA.emit("identify", { _id: user._id, name: user.name });
    clientB.emit("identify", { _id: "u-bob", name: "Bob" });

    const gotByB = new Promise((res) => clientB.once("chat:new", res));
    const ack = await new Promise((res) => clientA.emit("chat:send", { content: "live message over websocket" }, res));
    step("chat:send ack ->", ack);
    const received = await gotByB;
    step("clientB received chat:new ->", { sender: received.sender_name, content: received.content });
    evidence.steps.push({
      name: "socket-chat-broadcast",
      ok: received.content === "live message over websocket" && ack.ok === true,
    });

    r = await api("GET", "/api/chat");
    step("GET /api/chat (history) ->", { status: r.status, count: r.body.length });
    evidence.steps.push({ name: "chat-history", status: r.status, ok: r.body.length === 1 });

    clientA.disconnect();
    clientB.disconnect();

    const passed = evidence.steps.filter((s) => s.ok).length;
    const total = evidence.steps.length;
    evidence.summary = { passed, total, allPassed: passed === total };
    step(`SMOKE RESULT: ${passed}/${total} steps passed`);

    fs.writeFileSync(path.join(resultsDir, "smoke-output.json"), JSON.stringify(evidence, null, 2));
    fs.writeFileSync(path.join(resultsDir, "smoke-run.log"), log.join("\n") + "\n");
    step("wrote results/smoke-output.json and results/smoke-run.log");

    await handle.close();
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    step("SMOKE ERROR: " + err.message);
    fs.writeFileSync(path.join(resultsDir, "smoke-run.log"), log.join("\n") + "\n");
    await handle.close();
    process.exit(1);
  }
}

main();
