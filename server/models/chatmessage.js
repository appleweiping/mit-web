import mongoose from "mongoose";

// A message in the global real-time chat room. Broadcast over Socket.io and
// persisted so history is available when a client (re)connects.
const ChatMessageSchema = new mongoose.Schema({
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true },
  content: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("chatmessage", ChatMessageSchema);
