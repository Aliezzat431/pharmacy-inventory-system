import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    total: { type: Number, required: true },
    unitOptions: [{ type: String }],
    fullProduct: { type: mongoose.Schema.Types.Mixed }, // Original product snapshot
});

const OrderSchema = new mongoose.Schema({
    debtorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debtor', required: true },
    total: { type: Number, required: true },
    items: [OrderItemSchema],
}, { timestamps: true });

const DebtorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    partialPayments: { type: Number, default: 0 },
}, { timestamps: true });

export const getOrderModel = (conn) => conn.models.Order || conn.model('Order', OrderSchema);
export const getDebtorModel = (conn) => conn.models.Debtor || conn.model('Debtor', DebtorSchema);
