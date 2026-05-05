import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    content: { type: String, required: true },
    pharmacyId: { type: String, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export const getMessageModel = (conn) =>
    conn.models.Message || conn.model('Message', MessageSchema);
