import mongoose from "mongoose";

// A Catbook user. In the real weblab, `googleid` is the subject id returned by
// Google's OAuth flow. Locally we derive a stable id from the chosen name so the
// login flow is identical in shape but needs no external Google service.
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  googleid: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("user", UserSchema);
