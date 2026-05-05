import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'login',
            'logout',
            'register',
            'sale',
            'return',
            'product_add',
            'product_update',
            'product_delete',
            'withdrawal',
            'salary_payment',
            'settings_update',
            'debt_payment',
            'debt_create'
        ]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some activities might not have a user (system actions)
    },
    username: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

// Index for faster queries
ActivitySchema.index({ action: 1, createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: -1 });

export const getActivityModel = (conn) => {
    if (conn.models.Activity) {
        return conn.models.Activity;
    }
    return conn.model('Activity', ActivitySchema);
};
