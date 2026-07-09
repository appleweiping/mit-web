import crypto from "crypto";
import User from "./models/user.js";

/**
 * Google-OAuth-style login, stubbed for local development.
 *
 * The real MIT Web Lab flow: the browser runs Google Identity Services, gets a
 * signed JWT credential, POSTs it to the server, and the server verifies it with
 * google-auth-library and reads the `sub` (a stable per-user id) and `name`.
 *
 * Here we keep the exact same shape — the client POSTs a credential — but for a
 * fully offline, testable app we accept a `{ name }` (or a `{ token }`) and
 * derive a deterministic `googleid` from it. Swapping in real verification is a
 * one-function change (see verifyGoogleToken below).
 */
async function verifyCredential(body) {
  // A real deployment would do:
  //   const ticket = await googleClient.verifyIdToken({ idToken: body.credential });
  //   const { sub, name } = ticket.getPayload();
  // Local stub: accept a display name and synthesize a stable subject id.
  const name = (body?.name || body?.credential || "").toString().trim();
  if (!name) return null;
  const googleid =
    "local:" + crypto.createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0, 24);
  return { name, googleid };
}

async function getOrCreateUser({ name, googleid }) {
  let user = await User.findOne({ googleid });
  if (!user) {
    user = await User.create({ name, googleid });
  }
  return user;
}

export function userToJson(user) {
  return { _id: user._id.toString(), name: user.name, googleid: user.googleid };
}

// POST /api/login  { name }  ->  the logged-in user
export async function login(req, res) {
  const identity = await verifyCredential(req.body);
  if (!identity) {
    return res.status(400).json({ error: "a name (or credential) is required" });
  }
  const user = await getOrCreateUser(identity);
  req.session.user = userToJson(user);
  res.json(req.session.user);
}

// POST /api/logout
export function logout(req, res) {
  req.session.user = null;
  res.json({});
}

// GET /api/whoami  ->  the logged-in user, or {}
export function whoami(req, res) {
  res.json(req.session.user || {});
}

// Middleware: reject unauthenticated writes with 401.
export function ensureLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "not logged in" });
  }
  next();
}
