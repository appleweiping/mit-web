import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../server/app.js";
import Story from "../server/models/story.js";
import Comment from "../server/models/comment.js";
import User from "../server/models/user.js";

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Story.deleteMany({}), Comment.deleteMany({}), User.deleteMany({})]);
});

describe("auth", () => {
  it("whoami returns {} when logged out", async () => {
    const res = await request(app).get("/api/whoami");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it("login creates a user and sets the session", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/login").send({ name: "Ada Lovelace" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ada Lovelace");
    expect(res.body._id).toBeTruthy();
    expect(res.body.googleid).toMatch(/^local:/);

    const who = await agent.get("/api/whoami");
    expect(who.body._id).toBe(res.body._id);
  });

  it("login is idempotent for the same name (stable googleid)", async () => {
    const a = await request(app).post("/api/login").send({ name: "Grace Hopper" });
    const b = await request(app).post("/api/login").send({ name: "grace hopper" });
    expect(a.body._id).toBe(b.body._id); // case-insensitive stable id
    expect(await User.countDocuments()).toBe(1);
  });

  it("rejects login with no name", async () => {
    const res = await request(app).post("/api/login").send({});
    expect(res.status).toBe(400);
  });

  it("logout clears the session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Alan Turing" });
    await agent.post("/api/logout").send({});
    const who = await agent.get("/api/whoami");
    expect(who.body).toEqual({});
  });
});

describe("stories", () => {
  it("requires login to post a story", async () => {
    const res = await request(app).post("/api/story").send({ content: "hello" });
    expect(res.status).toBe(401);
  });

  it("creates and lists stories newest-first", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Poster" });
    const s1 = await agent.post("/api/story").send({ content: "first" });
    const s2 = await agent.post("/api/story").send({ content: "second" });
    expect(s1.status).toBe(200);
    expect(s2.body.content).toBe("second");

    const list = await request(app).get("/api/stories");
    expect(list.body).toHaveLength(2);
    expect(list.body[0].content).toBe("second"); // newest first
    expect(list.body[0].likeCount).toBe(0);
  });

  it("rejects an empty story", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Poster" });
    const res = await agent.post("/api/story").send({ content: "   " });
    expect(res.status).toBe(400);
  });
});

describe("likes", () => {
  it("toggles a like on and off", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Liker" });
    const story = (await agent.post("/api/story").send({ content: "like me" })).body;

    const liked = await agent.post("/api/like").send({ storyId: story._id, liked: true });
    expect(liked.body.likeCount).toBe(1);

    const unliked = await agent.post("/api/like").send({ storyId: story._id, liked: false });
    expect(unliked.body.likeCount).toBe(0);
  });

  it("does not double-count the same user's like", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Liker" });
    const story = (await agent.post("/api/story").send({ content: "x" })).body;
    await agent.post("/api/like").send({ storyId: story._id, liked: true });
    const again = await agent.post("/api/like").send({ storyId: story._id, liked: true });
    expect(again.body.likeCount).toBe(1);
  });

  it("404s liking a missing story", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Liker" });
    const res = await agent
      .post("/api/like")
      .send({ storyId: new mongoose.Types.ObjectId().toString(), liked: true });
    expect(res.status).toBe(404);
  });
});

describe("comments", () => {
  it("adds and lists comments for a story", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Commenter" });
    const story = (await agent.post("/api/story").send({ content: "topic" })).body;

    await agent.post("/api/comment").send({ parent: story._id, content: "nice!" });
    await agent.post("/api/comment").send({ parent: story._id, content: "agreed" });

    const list = await request(app).get("/api/comment").query({ parent: story._id });
    expect(list.body).toHaveLength(2);
    expect(list.body[0].content).toBe("nice!"); // oldest-first
    expect(list.body[0].creator_name).toBe("Commenter");
  });

  it("requires login to comment", async () => {
    const res = await request(app).post("/api/comment").send({ parent: "x", content: "y" });
    expect(res.status).toBe(401);
  });

  it("404s commenting on a missing story", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ name: "Commenter" });
    const res = await agent
      .post("/api/comment")
      .send({ parent: new mongoose.Types.ObjectId().toString(), content: "hi" });
    expect(res.status).toBe(404);
  });
});

describe("profile", () => {
  it("returns only the logged-in user's stories", async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);
    await alice.post("/api/login").send({ name: "Alice" });
    await bob.post("/api/login").send({ name: "Bob" });
    await alice.post("/api/story").send({ content: "alice-1" });
    await alice.post("/api/story").send({ content: "alice-2" });
    await bob.post("/api/story").send({ content: "bob-1" });

    const mine = await alice.get("/api/profile/stories");
    expect(mine.body).toHaveLength(2);
    expect(mine.body.every((s) => s.creator_name === "Alice")).toBe(true);
  });
});

describe("routing", () => {
  it("404s an unknown api route", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });
});
