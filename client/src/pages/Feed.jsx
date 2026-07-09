import React, { useEffect, useState, useCallback } from "react";
import { get, post } from "../utilities.js";
import { socket } from "../socket.js";
import Story from "../components/Story.jsx";
import NewPostInput from "../components/NewPostInput.jsx";

/**
 * The main feed. Loads stories + comments over REST, then keeps them live with
 * Socket.io: new stories, new likes, and new comments all arrive as events and
 * update the UI without a refetch.
 */
export default function Feed({ user }) {
  const [stories, setStories] = useState([]);
  const [commentsByStory, setCommentsByStory] = useState({});

  const loadComments = useCallback((storyId) => {
    get("/api/comment", { parent: storyId }).then((comments) => {
      setCommentsByStory((prev) => ({ ...prev, [storyId]: comments }));
    });
  }, []);

  // Initial load.
  useEffect(() => {
    get("/api/stories").then((data) => {
      setStories(data);
      data.forEach((s) => loadComments(s._id));
    });
  }, [loadComments]);

  // Real-time subscriptions.
  useEffect(() => {
    const onNewStory = (story) => {
      setStories((prev) =>
        prev.some((s) => s._id === story._id) ? prev : [story, ...prev]
      );
    };
    const onLike = ({ storyId, likes, likeCount }) => {
      setStories((prev) =>
        prev.map((s) => (s._id === storyId ? { ...s, likes, likeCount } : s))
      );
    };
    const onNewComment = (comment) => {
      setCommentsByStory((prev) => {
        const existing = prev[comment.parent] || [];
        if (existing.some((c) => c._id === comment._id)) return prev;
        return { ...prev, [comment.parent]: [...existing, comment] };
      });
    };

    socket.on("story:new", onNewStory);
    socket.on("story:like", onLike);
    socket.on("comment:new", onNewComment);
    return () => {
      socket.off("story:new", onNewStory);
      socket.off("story:like", onLike);
      socket.off("comment:new", onNewComment);
    };
  }, []);

  const submitStory = (content) => {
    post("/api/story", { content }).then((story) => {
      // The socket echo also arrives; the de-dupe in onNewStory keeps it clean.
      setStories((prev) => (prev.some((s) => s._id === story._id) ? prev : [story, ...prev]));
    });
  };

  const toggleLike = (story, nextLiked) => {
    post("/api/like", { storyId: story._id, liked: nextLiked }).then((updated) => {
      setStories((prev) =>
        prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s))
      );
    });
  };

  const addComment = (story, content) => {
    post("/api/comment", { parent: story._id, content }).then((comment) => {
      setCommentsByStory((prev) => {
        const existing = prev[story._id] || [];
        if (existing.some((c) => c._id === comment._id)) return prev;
        return { ...prev, [story._id]: [...existing, comment] };
      });
    });
  };

  return (
    <div className="Feed">
      <h1>Feed</h1>
      {user ? (
        <NewPostInput placeholder="Share a story…" buttonLabel="Post story" onSubmit={submitStory} />
      ) : (
        <p className="Feed-hint">Sign in above to post, like, and comment.</p>
      )}

      {stories.length === 0 && <p className="Feed-empty">No stories yet — be the first!</p>}

      {stories.map((story) => (
        <Story
          key={story._id}
          story={story}
          currentUser={user}
          comments={commentsByStory[story._id] || []}
          onToggleLike={toggleLike}
          onAddComment={addComment}
        />
      ))}
    </div>
  );
}
