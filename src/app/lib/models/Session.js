import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    shiftType: {
        type: String,
        enum: ['morning', 'night'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    },
    deviceInfo: {
        type: String
    }
}, { timestamps: true });

// Indexes for faster queries
SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ status: 1 });
SessionSchema.index({ shiftType: 1 });
SessionSchema.index({ startTime: -1 });

export const getSessionModel = (conn) => {
    if (conn.models.Session) {
        return conn.models.Session;
    }
    return conn.model('Session', SessionSchema);
};
