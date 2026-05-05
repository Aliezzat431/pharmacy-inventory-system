import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const getSettingModel = (conn) => conn.models.Setting || conn.model('Setting', SettingSchema);
