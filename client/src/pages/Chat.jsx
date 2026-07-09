import React, { useEffect, useState, useRef } from "react";
import { get } from "../utilities.js";
import { socket, identify } from "../socket.js";
import NewPostInput from "../components/NewPostInput.jsx";

/**
 * A global real-time chat room powered entirely by Socket.io. History is loaded
 * once over REST; every subsequent message arrives as a `chat:new` event, and a
 * live presence list is pushed as `active-users`.
 */
export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    get("/api/chat").then(setMessages);

    const onNew = (msg) =>
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    const onActive = (users) => setActiveUsers(users);

    socket.on("chat:new", onNew);
    socket.on("active-users", onActive);
    // Re-announce presence so the server re-broadcasts the active-user list to
    // this freshly-mounted page (it may have missed the login-time broadcast).
    if (user) identify(user);
    return () => {
      socket.off("chat:new", onNew);
      socket.off("active-users", onActive);
    };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (content) => {
    socket.emit("chat:send", { content });
  };

  return (
    <div className="Chat">
      <h1>Live Chat</h1>
      <div className="Chat-presence">
        {activeUsers.length} online
        {activeUsers.length > 0 && ": " + activeUsers.map((u) => u.name).join(", ")}
      </div>

      <div className="Chat-log">
        {messages.map((m) => (
          <div key={m._id} className="Chat-message">
            <span className="Chat-sender">{m.sender_name}</span>
            <span className="Chat-body">{m.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <NewPostInput placeholder="Type a message…" buttonLabel="Send" maxLength={500} onSubmit={send} />
      ) : (
        <p className="Chat-hint">Sign in above to join the chat.</p>
      )}
    </div>
  );
}
