import mongoose from 'mongoose';

const WinningSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  profit: { type: Number, default: 0 },
  reason: { type: String, required: true },
  transactionType: { 
    type: String, 
    enum: ['in', 'suspended', 'out', 'sadaqah', 'withdrawal', 'return'], // ✅ return موجود
    required: true 
  },
  invoiceNumber: { type: String },
  isVirtualInvoice: { type: Boolean, default: false },
  supplier: { type: String },
  debtorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debtor' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  date: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  strict: false // ✅ مهم: يسمح بحقول جديدة
});

export const getWinningModel = (conn) => {
  // 🔥 Force delete old model
  if (conn.models.Winning) {
    delete conn.models.Winning;
  }
  return conn.model('Winning', WinningSchema);
};