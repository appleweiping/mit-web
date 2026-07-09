import React from "react";
import Comment from "./Comment.jsx";
import NewPostInput from "./NewPostInput.jsx";

/**
 * A single feed story: author, body, like button, and its comment thread.
 * Purely presentational — all data and mutations flow through props, which keeps
 * it easy to unit test and lets the Feed own the network + socket wiring.
 */
export default function Story({ story, currentUser, comments = [], onToggleLike, onAddComment }) {
  const liked = !!currentUser && story.likes.includes(currentUser._id);
  const likeCount = story.likeCount ?? story.likes.length;

  return (
    <div className="Story">
      <div className="Story-header">
        <span className="Story-author">{story.creator_name}</span>
      </div>
      <div className="Story-content">{story.content}</div>

      <div className="Story-actions">
        <button
          type="button"
          className={liked ? "Story-like liked" : "Story-like"}
          disabled={!currentUser}
          aria-pressed={liked}
          aria-label={liked ? "Unlike story" : "Like story"}
          onClick={() => onToggleLike && onToggleLike(story, !liked)}
        >
          {liked ? "♥" : "♡"} <span className="Story-likeCount">{likeCount}</span>
        </button>
      </div>

      <div className="Story-comments">
        {comments.map((c) => (
          <Comment key={c._id} comment={c} />
        ))}
      </div>

      {currentUser && (
        <NewPostInput
          placeholder="Add a comment…"
          buttonLabel="Comment"
          onSubmit={(text) => onAddComment && onAddComment(story, text)}
        />
      )}
    </div>
  );
}
