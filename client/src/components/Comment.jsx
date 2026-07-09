import React from "react";

export default function Comment({ comment }) {
  return (
    <div className="Comment">
      <span className="Comment-author">{comment.creator_name}</span>
      <span className="Comment-body">{comment.content}</span>
    </div>
  );
}
