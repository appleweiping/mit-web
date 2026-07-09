import mongoose from "mongoose";

// A "story" is a Catbook post. Author fields are denormalized (creator_name)
// following the weblab pattern so the feed can render without a join. `likes`
// holds the string ids of users who liked the story.
const StorySchema = new mongoose.Schema({
  creator_id: { type: String, required: true },
  creator_name: { type: String, required: true },
  content: { type: String, required: true, maxlength: 280 },
  likes: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("story", StorySchema);
