import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Top navigation + the Google-OAuth-style login control.
 *
 * The real weblab renders a Google Sign-In button here. For a fully offline app
 * we present a "Sign in" prompt that asks for a display name and POSTs it to the
 * same /api/login endpoint the Google flow would use.
 */
export default function NavBar({ user, onLogin, onLogout }) {
  const [name, setName] = useState("");
  const location = useLocation();

  const linkClass = (path) => (location.pathname === path ? "NavBar-link active" : "NavBar-link");

  return (
    <nav className="NavBar">
      <div className="NavBar-brand">
        <Link to="/">🐱 Catbook</Link>
        <span className="NavBar-sub">MIT Web Lab</span>
      </div>

      <div className="NavBar-links">
        <Link className={linkClass("/")} to="/">
          Feed
        </Link>
        <Link className={linkClass("/chat")} to="/chat">
          Chat
        </Link>
        {user && (
          <Link className={linkClass("/profile")} to="/profile">
            Profile
          </Link>
        )}
      </div>

      <div className="NavBar-auth">
        {user ? (
          <>
            <span className="NavBar-user">Hi, {user.name}</span>
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <form
            className="NavBar-login"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = name.trim();
              if (trimmed) {
                onLogin(trimmed);
                setName("");
              }
            }}
          >
            <input
              type="text"
              aria-label="display name"
              placeholder="your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Sign in with Google</button>
          </form>
        )}
      </div>
    </nav>
  );
}
