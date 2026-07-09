import { io } from "socket.io-client";

// A single shared Socket.io connection for the whole app. In dev it is proxied
// to the backend by Vite (see client/vite.config.js); in production the client
// is served by the same origin as the API so the default URL is correct.
export const socket = io({ autoConnect: true });

export function identify(user) {
  socket.emit("identify", user ? { _id: user._id, name: user.name } : null);
}
