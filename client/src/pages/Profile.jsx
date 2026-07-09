import React, { useEffect, useState } from "react";
import { get } from "../utilities.js";

export default function Profile({ user }) {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    if (user) get("/api/profile/stories").then(setStories);
  }, [user]);

  if (!user) return <p>Please sign in to view your profile.</p>;

  const totalLikes = stories.reduce((sum, s) => sum + (s.likeCount ?? s.likes.length), 0);

  return (
    <div className="Profile">
      <h1>{user.name}</h1>
      <div className="Profile-stats">
        <span>{stories.length} stories</span>
        <span>{totalLikes} likes received</span>
      </div>
      {stories.map((s) => (
        <div key={s._id} className="Profile-story">
          <span className="Profile-story-content">{s.content}</span>
          <span className="Profile-story-likes">♥ {s.likeCount ?? s.likes.length}</span>
        </div>
      ))}
      {stories.length === 0 && <p>You haven't posted any stories yet.</p>}
    </div>
  );
}
