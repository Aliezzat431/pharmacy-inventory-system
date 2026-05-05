import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema({
    pharmacyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["user", "assistant", "system", "tool"], required: true },
    content: { type: String },
    name: { type: String }, // For tool results
    tool_call_id: { type: String }, // Link tool result to call
    tool_calls: { type: Array }, // Specifically for assistant messages
    createdAt: { type: Date, default: Date.now }
});

export const getChatMessageModel = (conn) => {
    return conn.models.ChatMessage || conn.model("ChatMessage", ChatMessageSchema);
};
