import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { get, post } from "./utilities.js";
import { identify } from "./socket.js";
import NavBar from "./components/NavBar.jsx";
import Feed from "./pages/Feed.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";

/**
 * Root component: owns the current user, wires login/logout to the API, and
 * tells the Socket.io server who we are (for chat presence).
 */
export default function App() {
  const [user, setUser] = useState(null);

  // Restore session on load.
  useEffect(() => {
    get("/api/whoami").then((u) => {
      if (u && u._id) {
        setUser(u);
        identify(u);
      }
    });
  }, []);

  const handleLogin = (name) => {
    post("/api/login", { name }).then((u) => {
      setUser(u);
      identify(u);
    });
  };

  const handleLogout = () => {
    post("/api/logout", {}).then(() => {
      setUser(null);
      identify(null);
    });
  };

  return (
    <div className="App">
      <NavBar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <main className="App-main">
        <Routes>
          <Route path="/" element={<Feed user={user} />} />
          <Route path="/chat" element={<Chat user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
        </Routes>
      </main>
    </div>
  );
}
