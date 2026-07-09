import { Server } from "socket.io";
import ChatMessage from "./models/chatmessage.js";

let io = null;

// Map of socket.id -> { _id, name } for users who have identified themselves.
const socketToUser = new Map();

function connectedUsers() {
  // De-duplicate by user id (a user may have multiple tabs open).
  const byId = new Map();
  for (const user of socketToUser.values()) {
    byId.set(user._id, user);
  }
  return [...byId.values()];
}

function broadcastActiveUsers() {
  if (!io) return;
  io.emit("active-users", connectedUsers());
}

/**
 * Attach a Socket.io server to an existing http.Server and wire up the
 * real-time chat + presence protocol.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    // Client announces who it is (or `null` when logged out).
    socket.on("identify", (user) => {
      if (user && user._id) {
        socketToUser.set(socket.id, { _id: user._id, name: user.name });
      } else {
        socketToUser.delete(socket.id);
      }
      broadcastActiveUsers();
    });

    // A chat message: persist it, then broadcast to everyone.
    socket.on("chat:send", async (payload, ack) => {
      try {
        const sender = socketToUser.get(socket.id);
        if (!sender) {
          if (typeof ack === "function") ack({ error: "not identified" });
          return;
        }
        const content = String(payload?.content ?? "").trim();
        if (!content) {
          if (typeof ack === "function") ack({ error: "empty message" });
          return;
        }
        const message = await ChatMessage.create({
          sender_id: sender._id,
          sender_name: sender.name,
          content: content.slice(0, 500),
        });
        io.emit("chat:new", messageToJson(message));
        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        if (typeof ack === "function") ack({ error: err.message });
      }
    });

    socket.on("disconnect", () => {
      socketToUser.delete(socket.id);
      broadcastActiveUsers();
    });
  });

  return io;
}

export function messageToJson(m) {
  return {
    _id: m._id.toString(),
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    content: m.content,
    timestamp: m.timestamp,
  };
}

// Used by the REST API to push feed updates to all connected clients.
export function getIo() {
  return io;
}

export function emit(event, data) {
  if (io) io.emit(event, data);
}

// Exposed for tests to assert presence bookkeeping.
export function _activeUsers() {
  return connectedUsers();
}
