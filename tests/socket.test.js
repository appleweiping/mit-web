import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io as ioClient } from "socket.io-client";
import { startServer } from "../server/server.js";
import ChatMessage from "../server/models/chatmessage.js";

let handle;
let url;

function connectClient() {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, { transports: ["websocket"], forceNew: true });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

beforeAll(async () => {
  handle = await startServer({ port: 0 }); // ephemeral port + in-memory MongoDB
  url = `http://localhost:${handle.port}`;
});

afterAll(async () => {
  await handle.close();
});

describe("Socket.io real-time chat", () => {
  it("broadcasts a chat message to all connected clients and persists it", async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    alice.emit("identify", { _id: "u-alice", name: "Alice" });
    bob.emit("identify", { _id: "u-bob", name: "Bob" });

    const bobReceives = once(bob, "chat:new");
    const aliceReceives = once(alice, "chat:new");

    const ack = await new Promise((resolve) =>
      alice.emit("chat:send", { content: "hello sockets" }, resolve)
    );
    expect(ack).toEqual({ ok: true });

    const [msgToBob, msgToAlice] = await Promise.all([bobReceives, aliceReceives]);
    expect(msgToBob.content).toBe("hello sockets");
    expect(msgToBob.sender_name).toBe("Alice");
    expect(msgToAlice._id).toBe(msgToBob._id);

    // Persisted to MongoDB.
    const stored = await ChatMessage.findById(msgToBob._id);
    expect(stored).not.toBeNull();
    expect(stored.content).toBe("hello sockets");

    alice.disconnect();
    bob.disconnect();
  });

  it("rejects a chat message from an unidentified socket", async () => {
    const ghost = await connectClient();
    const ack = await new Promise((resolve) =>
      ghost.emit("chat:send", { content: "who am i" }, resolve)
    );
    expect(ack.error).toBeTruthy();
    ghost.disconnect();
  });

  it("broadcasts the active-user presence list", async () => {
    const client = await connectClient();
    const presence = once(client, "active-users");
    client.emit("identify", { _id: "u-present", name: "Present" });
    const users = await presence;
    expect(users.some((u) => u._id === "u-present")).toBe(true);
    client.disconnect();
  });
});
