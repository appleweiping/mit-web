# Catbook — MIT Web Lab (web.lab) Full-Stack MERN App

> A complete, from-scratch MERN social app (React + Express + MongoDB + Socket.io)
> built along the lecture arc of **MIT web.lab (6.148) — Web Development**
> ([weblab.mit.edu](https://weblab.mit.edu/)), part of a
> [csdiy.wiki](https://csdiy.wiki/) full-catalog build.

![status](https://img.shields.io/badge/status-complete-brightgreen)
![language](https://img.shields.io/badge/JavaScript-informational)
![stack](https://img.shields.io/badge/MERN-React·Express·MongoDB·Socket.io-blue)
![tests](https://img.shields.io/badge/tests-29%2F29%20passing-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

## Overview

MIT web.lab teaches full-stack web development end-to-end: HTML/CSS, JavaScript,
React (components/props/state), a Node/Express API, MongoDB persistence,
Google-OAuth login, and real-time features with Socket.io — all taught through a
sample social app called **Catbook**. This repository is a substantive,
genuinely-working implementation of that Catbook arc:

- a **React** single-page frontend (feed, live chat, profile) built with Vite;
- an **Express + MongoDB (Mongoose)** backend with a real data model
  (users, stories, comments, likes, chat messages);
- **Google-OAuth-style login**, stubbed for local/offline use (same POST-a-
  credential shape as the real Google Identity flow, with a one-function swap
  point for real verification);
- a **real-time chat + live feed** over **Socket.io** (messages, presence, and
  new-story / like / comment events pushed to all clients);
- it runs on a fresh machine with **zero external services** — when `MONGO_URI`
  is unset the server boots an in-process MongoDB (`mongodb-memory-server`).

## Results (measured on Windows, Node v22.21.1, CPU-only)

| Area | What it does | Result (measured) |
|---|---|---|
| Automated tests | Vitest across API, sockets, components | **29/29 passing** (16 API + 3 socket + 10 component), ~64s |
| API integration | supertest against the real Express app + in-memory MongoDB | 16/16 (auth, stories, likes, comments, profile, routing) |
| Socket.io integration | two live socket.io-clients, broadcast + persistence + presence | 3/3 |
| React components | React Testing Library (NewPostInput, Story, utilities) | 10/10 |
| Headless smoke run | boots full stack, drives real HTTP + websocket flow | **10/10 steps passed** |
| Production build | `vite build` | 69 modules → `index.js` 213.8 kB (68.9 kB gzip), 3.9s |
| In-browser E2E | production build served, driven headlessly | 3 stories, 1 comment, like count = 2, chat message over socket, **0 console errors** |

**Real evidence in [`results/`](results/):**

- [`results/test-output.txt`](results/test-output.txt) — full verbose per-test list, `29 passed (29)`.
- [`results/smoke-output.json`](results/smoke-output.json) / [`results/smoke-run.log`](results/smoke-run.log) — the headless run driving every endpoint + a live websocket:
  ```
  server up on http://localhost:54872 (db: in-memory MongoDB)
  POST /api/login -> {"status":200,"user":{"name":"Ada Lovelace",...}}
  POST /api/story  -> 200 ; POST /api/like -> {"likeCount":1}
  POST /api/comment -> 200 ; GET /api/stories -> {"count":1,"topLikes":1}
  chat:send ack -> {"ok":true}
  clientB received chat:new -> {"sender":"Ada Lovelace","content":"live message over websocket"}
  SMOKE RESULT: 10/10 steps passed
  ```
- [`results/browser-verification.json`](results/browser-verification.json) — live-browser checks against the running production build (logged-in feed, presence `1 online: Ada Lovelace`, socket message round-trip, session restore via cookie).
- [`results/app-feed-snapshot.html`](results/app-feed-snapshot.html) — the actual rendered feed DOM captured from the running app (open in a browser to view).

## Implemented features (mapped to the web.lab lecture arc)

- [x] **HTML/CSS + layout** — semantic SPA shell, responsive flexbox layout, component styling (`client/src/index.css`).
- [x] **JavaScript + fetch utilities** — `formatParams` / `get` / `post` helpers mirroring the weblab starter (`client/src/utilities.js`).
- [x] **React: components, props & state** — `NavBar`, `Story`, `Comment`, `NewPostInput`, pages `Feed` / `Chat` / `Profile`, wired with React Router.
- [x] **Node/Express API** — REST routes for auth, stories, likes, comments, chat history, profile (`server/api.js`).
- [x] **MongoDB data model (Mongoose)** — `User`, `Story`, `Comment`, `ChatMessage` (`server/models/`).
- [x] **Authentication (Google-OAuth-style)** — session-backed login/logout/whoami with a stable per-user id; offline stub with a documented real-verification swap point (`server/auth.js`).
- [x] **Real-time with Socket.io** — global chat, live presence (active users), and live feed push (new story / like / comment) (`server/socket.js`, `client/src/pages/Chat.jsx`, `client/src/pages/Feed.jsx`).
- [x] **Deployment-ready build** — Vite production build served by the same Express origin; boots with no external DB.

## Project structure

```
mit-web/
├── server/                 # Express + Socket.io + Mongoose backend
│   ├── models/             # user, story, comment, chatmessage schemas
│   ├── api.js              # REST routes (auth, stories, likes, comments, chat, profile)
│   ├── auth.js             # Google-OAuth-style login (local stub) + session middleware
│   ├── socket.js           # Socket.io: chat, presence, feed push
│   ├── db.js               # Mongoose connect (real MONGO_URI or in-memory MongoDB)
│   ├── app.js              # Express app factory (also serves the built client)
│   └── server.js           # boot: db + app + sockets; exported for tests/smoke
├── client/                 # React (Vite) single-page frontend
│   ├── src/
│   │   ├── components/      # NavBar, Story, Comment, NewPostInput
│   │   ├── pages/           # Feed, Chat, Profile
│   │   ├── App.jsx, main.jsx, utilities.js, socket.js, index.css
│   │   └── index.html
│   └── vite.config.js
├── tests/                  # Vitest: api.test.js, socket.test.js, components.test.jsx
├── scripts/smoke.js        # headless end-to-end smoke run
├── results/                # measured evidence (test log, smoke output, browser snapshot)
├── vitest.config.js
└── package.json
```

## How to run

Requires Node 18+. This repo was built with **pnpm** (any of pnpm/npm/yarn works).

```bash
pnpm install            # or: npm install

# 1) Run the automated test suite (API + sockets + components)
pnpm test               # 29/29 passing

# 2) Headless end-to-end smoke run (boots the full stack, hits real endpoints + a websocket)
pnpm smoke              # SMOKE RESULT: 10/10 steps passed

# 3) Build the production client, then run the whole app on one origin
pnpm build
pnpm start              # -> http://localhost:3000  (uses in-memory MongoDB by default)

# 4) Or develop with hot reload (two terminals):
pnpm dev:server         # Express + Socket.io on :3000
pnpm dev:client         # Vite dev server on :5173 (proxies /api and /socket.io)
```

No MongoDB installation is required: if `MONGO_URI` is unset the server starts an
in-process MongoDB via `mongodb-memory-server`. To use a real database, copy
`.env.example` to `.env` and set `MONGO_URI`.

To try it: open the app, type a name and click **Sign in** (the local
Google-login stub), then post a story, like/comment, and open **Chat** in a
second tab to see messages and presence update live.

## Verification

- **Unit/integration tests** (`pnpm test`, log in `results/test-output.txt`):
  - `tests/api.test.js` (16) — drives the real Express app with **supertest** against an in-memory MongoDB: session auth, idempotent login, 401 on unauthenticated writes, newest-first feed, like toggle + no double-count, 404s on missing stories, per-user profile isolation.
  - `tests/socket.test.js` (3) — starts the real server on an ephemeral port and connects two **socket.io-client** sockets: a chat message is broadcast to both clients **and persisted to MongoDB**, unidentified sockets are rejected, and the presence list is broadcast.
  - `tests/components.test.jsx` (10) — **React Testing Library**: `NewPostInput` submit/clear/Enter/empty-guard, `Story` like toggle + `aria-pressed` + comment rendering, and `formatParams`.
- **Headless smoke run** (`pnpm smoke`, `results/smoke-output.json`) — logs in, posts a story, likes it, comments, lists the feed/profile, then opens two websockets and round-trips a live chat message: **10/10 steps**.
- **In-browser E2E** (`results/browser-verification.json`, `results/app-feed-snapshot.html`) — the production Vite build served by Express and driven headlessly: signed in as Ada Lovelace, 3 stories render, a story shows 2 likes and a comment, a chat message is sent over Socket.io and shows presence `1 online`, the session survives reload, and there are **0 console errors**.

## Tech stack

- **Frontend:** React 18, React Router 6, Vite 6, socket.io-client.
- **Backend:** Node.js, Express 4, Mongoose 8 (MongoDB), express-session, Socket.io 4.
- **Testing:** Vitest 2, supertest, @testing-library/react + jest-dom, jsdom, mongodb-memory-server.

## Key ideas / what I learned

- **Full MERN request lifecycle** — a React SPA calling a REST API, an Express
  router with session auth middleware, and Mongoose documents, all serialized
  through explicit `toJson` helpers.
- **Real-time UI** — Socket.io for a chat room with presence, plus pushing feed
  mutations (new story / like / comment) to every client and de-duping the local
  echo so optimistic updates and broadcasts don't double-render.
- **Auth as a swappable seam** — the login endpoint has the exact shape of the
  Google Identity flow (client POSTs a credential; server derives a stable
  subject id and sets a session), so real `google-auth-library` verification is
  a one-function change.
- **Zero-dependency runnability** — booting an in-process MongoDB makes the same
  code path serve the dev app, the test suite, and the smoke run with nothing
  external installed.
- **Testing a full stack** — supertest for HTTP + sessions, live socket.io
  clients for real-time behavior, and RTL for component logic.

## Credits & license

Based on the curriculum and the **Catbook** sample project of **MIT web.lab
(6.148) — Web Development** ([weblab.mit.edu](https://weblab.mit.edu/)). This
repository is an independent educational reimplementation; all course materials
and specifications belong to their original authors. Original code in this repo
is released under the [MIT License](LICENSE).
