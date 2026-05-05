import mongoose from 'mongoose';

// ============================================================
// 🔥 Schema للدفعة الواحدة (Batch)
// ============================================================
const BatchSchema = new mongoose.Schema({
  batchNumber: { 
    type: String, 
    required: true,
    default: () => `BATCH-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  },
  
  // باركود الدفعة (الباركود الموجود على العبوة)
  barcode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  quantity: { type: Number, required: true, default: 0, min: 0 },
  purchasePrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date, required: true },
  purchaseDate: { type: Date, default: Date.now },
  supplier: { type: String },
  invoiceNumber: { type: String },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
}, { _id: true, timestamps: true });

// ============================================================
// 🔥 Schema الرئيسي للمنتج
// ============================================================
const ProductSchema = new mongoose.Schema({
  // البيانات الأساسية الثابتة للمنتج
  name: { type: String, required: true, index: true },
  type: { type: String, required: true },
  unit: { type: String, required: true },
  unitConversion: { type: Number, default: 1 },
  company: { type: String, required: true },
  details: { type: String, default: "" },
  unitOptions: [{ type: String }],
  isBaseUnit: { type: Boolean, default: false },
  
  // 🔥 الدفعات (كل دفعة لها باركود مختلف)
  batches: [BatchSchema],
  
  // إعدادات إدارة المخزون
  inventoryMethod: { 
    type: String, 
    enum: ['FEFO', 'FIFO', 'LIFO'], 
    default: 'FEFO'  // First Expiry First Out (الأقدم صلاحية أولاً)
  },
  lowStockThreshold: { type: Number, default: 5 },
  isShortcoming: { type: Boolean, default: false },
  
}, { timestamps: true });

// ============================================================
// 🔥 Virtuals (خصائص محسوبة)
// ============================================================

// إجمالي الكمية من جميع الدفعات
ProductSchema.virtual('totalQuantity').get(function() {
  return this.batches.reduce((sum, batch) => sum + (batch.isActive ? batch.quantity : 0), 0);
});

// الدفعات النشطة (ليها كمية ومفعالة)
ProductSchema.virtual('activeBatches').get(function() {
  return this.batches.filter(b => b.isActive && b.quantity > 0);
});

// أقل سعر متاح حالياً
ProductSchema.virtual('lowestPrice').get(function() {
  const prices = this.activeBatches.map(b => b.sellingPrice);
  return prices.length > 0 ? Math.min(...prices) : 0;
});

// أعلى سعر متاح حالياً
ProductSchema.virtual('highestPrice').get(function() {
  const prices = this.activeBatches.map(b => b.sellingPrice);
  return prices.length > 0 ? Math.max(...prices) : 0;
});

// نطاق الأسعار
ProductSchema.virtual('priceRange').get(function() {
  const prices = this.activeBatches.map(b => b.sellingPrice);
  if (prices.length === 0) return { min: 0, max: 0, hasVariation: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, hasVariation: min !== max };
});

// السعر الحالي (حسب طريقة المخزون)
ProductSchema.virtual('currentPrice').get(function() {
  if (this.activeBatches.length === 0) return 0;
  
  switch (this.inventoryMethod) {
    case 'FEFO': // الدفعة الأقدم صلاحية
      const oldestBatch = this.getBatchesByExpiry()[0];
      return oldestBatch?.sellingPrice || 0;
      
    case 'FIFO': // الدفعة الأقدم شراء
      const firstBatch = this.getBatchesByPurchaseDate()[0];
      return firstBatch?.sellingPrice || 0;
      
    default: // متوسط السعر المرجح بالكمية
      const totalValue = this.activeBatches.reduce((sum, b) => sum + (b.quantity * b.sellingPrice), 0);
      const totalQty = this.activeBatches.reduce((sum, b) => sum + b.quantity, 0);
      return totalQty > 0 ? totalValue / totalQty : 0;
  }
});

// ============================================================
// 🔥 Methods (دوال على مستوى المستند)
// ============================================================

// الحصول على الدفعات حسب تاريخ الانتهاء (الأقدم أولاً)
ProductSchema.methods.getBatchesByExpiry = function() {
  return [...this.batches]
    .filter(b => b.isActive && b.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
};

// الحصول على الدفعات حسب تاريخ الشراء (الأقدم أولاً)
ProductSchema.methods.getBatchesByPurchaseDate = function() {
  return [...this.batches]
    .filter(b => b.isActive && b.quantity > 0)
    .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
};

// الحصول على الدفعات حسب السعر
ProductSchema.methods.getBatchesByPrice = function(order = 'asc') {
  return [...this.batches]
    .filter(b => b.isActive && b.quantity > 0)
    .sort((a, b) => order === 'asc' 
      ? a.sellingPrice - b.sellingPrice 
      : b.sellingPrice - a.sellingPrice);
};

// البحث عن دفعة بالباركود
ProductSchema.methods.findBatchByBarcode = function(barcode) {
  return this.batches.find(batch => batch.barcode === barcode && batch.isActive);
};

// إضافة دفعة جديدة
ProductSchema.methods.addBatch = function(batchData) {
  // التأكد من عدم تكرار الباركود
  const existingBatch = this.batches.find(b => b.barcode === batchData.barcode);
  if (existingBatch) {
    throw new Error(`الباركود ${batchData.barcode} موجود بالفعل للدفعة ${existingBatch.batchNumber}`);
  }
  
  const newBatch = {
    batchNumber: batchData.batchNumber || `BATCH-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    barcode: batchData.barcode,
    quantity: batchData.quantity,
    purchasePrice: batchData.purchasePrice,
    sellingPrice: batchData.sellingPrice,
    expiryDate: new Date(batchData.expiryDate),
    purchaseDate: new Date(),
    supplier: batchData.supplier,
    invoiceNumber: batchData.invoiceNumber,
    notes: batchData.notes,
    isActive: true
  };
  
  this.batches.push(newBatch);
  this.isShortcoming = this.totalQuantity < this.lowStockThreshold;
  
  return newBatch;
};

// تحديث سعر دفعة
ProductSchema.methods.updateBatchPrice = function(batchId, newSellingPrice) {
  const batch = this.batches.id(batchId);
  if (!batch) {
    throw new Error('الدفعة غير موجودة');
  }
  batch.sellingPrice = newSellingPrice;
  return batch;
};

// تحديث كمية دفعة
ProductSchema.methods.updateBatchQuantity = function(batchId, newQuantity) {
  const batch = this.batches.id(batchId);
  if (!batch) {
    throw new Error('الدفعة غير موجودة');
  }
  batch.quantity = newQuantity;
  this.isShortcoming = this.totalQuantity < this.lowStockThreshold;
  return batch;
};

// إلغاء تنشيط دفعة (بدل حذفها)
ProductSchema.methods.deactivateBatch = function(batchId) {
  const batch = this.batches.id(batchId);
  if (!batch) {
    throw new Error('الدفعة غير موجودة');
  }
  batch.isActive = false;
  return batch;
};

// خصم كمية من المخزون
ProductSchema.methods.deductQuantity = async function(quantity, barcode = null) {
  if (quantity <= 0) {
    throw new Error('الكمية المطلوبة يجب أن تكون أكبر من صفر');
  }
  
  let remainingToDeduct = quantity;
  const batchesToProcess = [];
  
  // إذا تم تحديد باركود دفعة معينة
  if (barcode) {
    const targetBatch = this.batches.find(b => b.barcode === barcode);
    if (targetBatch && targetBatch.isActive && targetBatch.quantity > 0) {
      const deductQty = Math.min(targetBatch.quantity, remainingToDeduct);
      batchesToProcess.push({ batch: targetBatch, quantity: deductQty });
      remainingToDeduct -= deductQty;
    } else {
      throw new Error(`الباركود ${barcode} غير موجود أو الدفعة غير نشطة`);
    }
  }
  
  // إذا بقت كمية، نكمل حسب طريقة المخزون
  if (remainingToDeduct > 0) {
    let orderedBatches = [];
    
    switch (this.inventoryMethod) {
      case 'FEFO':
        orderedBatches = this.getBatchesByExpiry();
        break;
      case 'FIFO':
        orderedBatches = this.getBatchesByPurchaseDate();
        break;
      case 'LIFO':
        orderedBatches = [...this.getBatchesByPurchaseDate()].reverse();
        break;
      default:
        orderedBatches = this.getBatchesByExpiry();
    }
    
    for (const batch of orderedBatches) {
      if (remainingToDeduct <= 0) break;
      if (barcode && batch.barcode === barcode) continue;
      
      const deductQty = Math.min(batch.quantity, remainingToDeduct);
      batchesToProcess.push({ batch, quantity: deductQty });
      remainingToDeduct -= deductQty;
    }
  }
  
  if (remainingToDeduct > 0) {
    throw new Error(`الكمية المطلوبة (${quantity}) أكبر من المتوفر (${this.totalQuantity})`);
  }
  
  // تطبيق الخصم
  const result = {
    batches: [],
    totalCost: 0,
    totalRevenue: 0,
    profit: 0,
    details: []
  };
  
  for (const item of batchesToProcess) {
    const batch = item.batch;
    const deductQty = item.quantity;
    
    batch.quantity -= deductQty;
    
    result.batches.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      barcode: batch.barcode,
      quantity: deductQty,
      purchasePrice: batch.purchasePrice,
      sellingPrice: batch.sellingPrice,
      expiryDate: batch.expiryDate
    });
    
    result.totalCost += deductQty * batch.purchasePrice;
    result.totalRevenue += deductQty * batch.sellingPrice;
    result.details.push(`${deductQty} ${this.unit} بسعر ${batch.sellingPrice} ج.م (باركود: ${batch.barcode})`);
  }
  
  result.profit = result.totalRevenue - result.totalCost;
  
  // 🔥 حذف الدفعات اللي خلصت (quantity = 0)
  this.batches = this.batches.filter(batch => batch.quantity > 0);
  
  // تحديث حالة النقص
  this.isShortcoming = this.totalQuantity < this.lowStockThreshold;
  
  return result;
};

// الحصول على تفاصيل الدفعات للعرض
ProductSchema.methods.getBatchDetails = function() {
  return this.batches.map(batch => ({
    id: batch._id,
    batchNumber: batch.batchNumber,
    barcode: batch.barcode,
    quantity: batch.quantity,
    purchasePrice: batch.purchasePrice,
    sellingPrice: batch.sellingPrice,
    expiryDate: batch.expiryDate,
    purchaseDate: batch.purchaseDate,
    supplier: batch.supplier,
    invoiceNumber: batch.invoiceNumber,
    isActive: batch.isActive,
    daysUntilExpiry: Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
  }));
};

// ============================================================
// 🔥 Statics (دوال على مستوى النموذج)
// ============================================================

// البحث عن منتج بالاسم
ProductSchema.statics.findByName = function(name) {
  return this.findOne({ name: { $regex: new RegExp(name, 'i') } });
};

// البحث عن منتج بالباركود (في أي دفعة)
ProductSchema.statics.findByBarcode = async function(barcode) {
  return this.findOne({ 'batches.barcode': barcode });
};

// البحث عن المنتج والدفعة معاً
ProductSchema.statics.findByBatchBarcode = async function(barcode) {
  const product = await this.findOne({ 'batches.barcode': barcode });
  if (!product) return null;
  
  const batch = product.batches.find(b => b.barcode === barcode);
  return { product, batch };
};

// الحصول على جميع المنتجات الناقصة
ProductSchema.statics.findShortcomings = function() {
  return this.find({ isShortcoming: true }).sort({ name: 1 });
};

// الحصول على المنتجات التي ستنتهي صلاحيتها قريباً
ProductSchema.statics.findExpiringSoon = function(days = 30) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  return this.find({
    'batches.expiryDate': { $lte: targetDate, $gte: new Date() },
    'batches.quantity': { $gt: 0 }
  }).sort({ 'batches.expiryDate': 1 });
};

// الحصول على المنتجات المنتهية الصلاحية
ProductSchema.statics.findExpired = function() {
  return this.find({
    'batches.expiryDate': { $lt: new Date() },
    'batches.quantity': { $gt: 0 }
  }).sort({ 'batches.expiryDate': 1 });
};

// ============================================================
// 🔥 Middleware
// ============================================================

// قبل الحفظ: تحديث حالة النقص
ProductSchema.pre('save', function(next) {
  this.isShortcoming = this.totalQuantity < this.lowStockThreshold;
  next();
});

// ============================================================
// 🔥 Indexes
// ============================================================

ProductSchema.index({ name: 'text' });
ProductSchema.index({ 'batches.barcode': 1 });
ProductSchema.index({ 'batches.expiryDate': 1 });
ProductSchema.index({ isShortcoming: 1 });

// ============================================================
// 🔥 Export
// ============================================================

export const getProductModel = (conn) => {
  if (conn.models.Product) {
    delete conn.models.Product;
  }
  return conn.model('Product', ProductSchema);
};