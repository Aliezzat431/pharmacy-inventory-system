import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
        required: true
    },
    currentValue: {
        type: Number,
        required: true,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

export const getCounterModel = (conn) =>
    conn.models.Counter || conn.model('Counter', CounterSchema);
