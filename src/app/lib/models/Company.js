import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true });

export const getCompanyModel = (conn) => conn.models.Company || conn.model('Company', CompanySchema);
