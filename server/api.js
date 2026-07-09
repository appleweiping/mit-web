import express from "express";
import Story from "./models/story.js";
import Comment from "./models/comment.js";
import ChatMessage from "./models/chatmessage.js";
import { login, logout, whoami, ensureLoggedIn } from "./auth.js";
import { emit, messageToJson } from "./socket.js";

const router = express.Router();

// Wrap async handlers so rejected promises (e.g. Mongoose CastErrors) are
// forwarded to Express's error middleware instead of hanging the request.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- serialization helpers -------------------------------------------------
function storyToJson(s) {
  return {
    _id: s._id.toString(),
    creator_id: s.creator_id,
    creator_name: s.creator_name,
    content: s.content,
    likes: s.likes,
    likeCount: s.likes.length,
    createdAt: s.createdAt,
  };
}

function commentToJson(c) {
  return {
    _id: c._id.toString(),
    creator_id: c.creator_id,
    creator_name: c.creator_name,
    parent: c.parent,
    content: c.content,
    createdAt: c.createdAt,
  };
}

// ---- auth -------------------------------------------------------------------
router.post("/login", login);
router.post("/logout", logout);
router.get("/whoami", whoami);

// ---- stories (feed) ---------------------------------------------------------
router.get("/stories", h(async (_req, res) => {
  const stories = await Story.find({}).sort({ createdAt: -1 }).limit(200);
  res.json(stories.map(storyToJson));
}));

router.post("/story", ensureLoggedIn, h(async (req, res) => {
  const content = (req.body?.content || "").toString().trim();
  if (!content) return res.status(400).json({ error: "content is required" });
  const story = await Story.create({
    creator_id: req.session.user._id,
    creator_name: req.session.user.name,
    content: content.slice(0, 280),
  });
  const json = storyToJson(story);
  emit("story:new", json); // real-time feed update
  res.json(json);
}));

// ---- likes ------------------------------------------------------------------
router.post("/like", ensureLoggedIn, h(async (req, res) => {
  const { storyId, liked } = req.body || {};
  const story = await Story.findById(storyId);
  if (!story) return res.status(404).json({ error: "story not found" });
  const userId = req.session.user._id;
  const has = story.likes.includes(userId);
  if (liked && !has) story.likes.push(userId);
  if (!liked && has) story.likes = story.likes.filter((id) => id !== userId);
  await story.save();
  const json = storyToJson(story);
  emit("story:like", { storyId: json._id, likes: json.likes, likeCount: json.likeCount });
  res.json(json);
}));

// ---- comments ---------------------------------------------------------------
router.get("/comment", h(async (req, res) => {
  const parent = (req.query.parent || "").toString();
  if (!parent) return res.status(400).json({ error: "parent is required" });
  const comments = await Comment.find({ parent }).sort({ createdAt: 1 });
  res.json(comments.map(commentToJson));
}));

router.post("/comment", ensureLoggedIn, h(async (req, res) => {
  const { parent } = req.body || {};
  const content = (req.body?.content || "").toString().trim();
  if (!parent) return res.status(400).json({ error: "parent is required" });
  if (!content) return res.status(400).json({ error: "content is required" });
  const story = await Story.findById(parent);
  if (!story) return res.status(404).json({ error: "story not found" });
  const comment = await Comment.create({
    creator_id: req.session.user._id,
    creator_name: req.session.user.name,
    parent,
    content: content.slice(0, 280),
  });
  const json = commentToJson(comment);
  emit("comment:new", json); // real-time comment update
  res.json(json);
}));

// ---- chat history -----------------------------------------------------------
router.get("/chat", h(async (_req, res) => {
  const messages = await ChatMessage.find({}).sort({ timestamp: 1 }).limit(200);
  res.json(messages.map(messageToJson));
}));

// ---- profile: a user's own stories -----------------------------------------
router.get("/profile/stories", ensureLoggedIn, h(async (req, res) => {
  const stories = await Story.find({ creator_id: req.session.user._id }).sort({ createdAt: -1 });
  res.json(stories.map(storyToJson));
}));

// Fallthrough for unknown API routes.
router.all("/*", (req, res) => {
  res.status(404).json({ error: `unknown api route: ${req.method} ${req.path}` });
});

export default router;
