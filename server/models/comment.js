import mongoose from "mongoose";

// A comment attached to a story. `parent` is the story's _id (as a string).
const CommentSchema = new mongoose.Schema({
  creator_id: { type: String, required: true },
  creator_name: { type: String, required: true },
  parent: { type: String, required: true },
  content: { type: String, required: true, maxlength: 280 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("comment", CommentSchema);
