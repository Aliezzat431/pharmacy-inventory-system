import mongoose from 'mongoose';

const MONGODB_URI_1 = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-stock';
const MONGODB_URI_2 = process.env.MONGODB_URI_2 || 'mongodb://localhost:27017/pharmacy-stock-2';

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: {}, promise: {} };
}

export async function getDb(pharmacyId = "1") {
    // Default to pharmacy 1 if not specified
    if (!pharmacyId) pharmacyId = "1";

    const uri = pharmacyId === "2" ? MONGODB_URI_2 : MONGODB_URI_1;

    if (cached.conn[pharmacyId]) {
        return cached.conn[pharmacyId];
    }

    if (!cached.promise[pharmacyId]) {
        const opts = {
            bufferCommands: false,
            autoIndex: false,
        };

        cached.promise[pharmacyId] = mongoose.createConnection(uri, opts).asPromise();
    }

    try {
        cached.conn[pharmacyId] = await cached.promise[pharmacyId];
    } catch (e) {
        cached.promise[pharmacyId] = null;
        throw e;
    }

    return cached.conn[pharmacyId];
}
