'use server';

import { cookies } from 'next/headers';
import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';

// ==================== أدوات قراءة البيانات ====================

export async function searchProducts(query) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const user = await verifyToken({ get: () => token });
  if (!user) throw new Error('Unauthorized');

  /* ---------------- normalize ---------------- */
  const normalize = (str = "") =>
    str
      .toLowerCase()
      .replace(/mg|ml|mcg|g/gi, "")
      .replace(/tablet|tab|capsule|cap|pcs|pack|strip/gi, "")
      .replace(/[–\-\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedQuery = normalize(query);
  const words = normalizedQuery.split(" ").filter(Boolean);

  /* ---------------- database search ---------------- */
  // Initial search from Supabase
  let { data: products, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(50);

  if (error) throw error;

  /* ---------------- levenshtein ---------------- */
  const levenshtein = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
  };

  /* ---------------- ranking ---------------- */
  const ranked = (products || []).map(p => {
    const normalizedName = normalize(p.name);
    let score = 0;
    if (normalizedName.includes(normalizedQuery)) score += 5;
    const distance = levenshtein(normalizedQuery, normalizedName);
    if (distance <= 3) score += 3;
    if (normalizedName.startsWith(normalizedQuery)) score += 4;
    words.forEach(w => {
      if (normalizedName.includes(w)) score += 2;
    });
    return { ...p, score };
  });

  const results = ranked
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return results.map(p => ({
    _id: p.id,
    id: p.id,
    name: p.name,
    price: p.price,
    quantity: p.quantity,
    unit: p.unit,
    company: p.company,
    expiryDate: p.expiry_date,
    isShortcoming: p.is_shortcoming
  }));
}

export async function getLowStock() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const user = await verifyToken({ get: () => token });
  if (!user) throw new Error('Unauthorized');

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_shortcoming', true);

  if (error) throw error;
  
  return products.map(p => ({
    name: p.name,
    quantity: p.quantity,
    unit: p.unit,
    _id: p.id,
    id: p.id
  }));
}

export async function getDebtors() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const user = await verifyToken({ get: () => token });
  if (!user) throw new Error('Unauthorized');

  const { data: debtors, error: dErr } = await supabase
    .from('debtors')
    .select('*, orders(total)');
  
  if (dErr) throw dErr;

  const enriched = debtors.map(d => {
    const ordersTotal = (d.orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalDebt = ordersTotal - (Number(d.partial_payments) || 0);
    return {
      name: d.name,
      totalDebt,
      paid: d.partial_payments || 0,
      _id: d.id,
      id: d.id
    };
  });

  return enriched;
}

// ==================== أدوات تنفيذ الإجراءات (DOM-Active) ====================

export async function executeAction(actionType, params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const user = await verifyToken({ get: () => token });
  if (!user) throw new Error('Unauthorized');

  switch (actionType) {
    case 'CREATE_PRODUCT':
      return await createProduct(user, params);
    case 'UPDATE_PRODUCT':
      return await updateProduct(user, params);
    case 'DELETE_PRODUCT':
      return await deleteProduct(user, params);
    case 'SELL_PRODUCTS':
      return await sellProducts(user, params);
    case 'RESTOCK_PRODUCTS':
      return await restockProducts(user, params);
    default:
      throw new Error(`Unknown action: ${actionType}`);
  }
}

// ==================== تنفيذ الإجراءات الفعلية ====================

async function createProduct(user, { name, price, purchasePrice, quantity, type, company, barcode, expiryDate }) {
  const { getSetting } = await import('@/app/lib/getSetting');
  const { logActivity } = await import('@/app/lib/logActivity');

  // Ensure company exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('name', company)
    .single();

  if (!existingCompany) {
    await supabase.from('companies').insert({ name: company });
  }

  const threshold = await getSetting(null, 'lowStockThreshold', 5);
  const isShortcoming = Number(quantity) < threshold;

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name,
      type: type || 'دواء عادي برشام',
      unit: 'علبة',
      company,
      is_shortcoming: isShortcoming,
      unit_options: ['علبة', 'شريط']
    })
    .select()
    .single();

  if (error) throw error;

  // Add initial batch
  await supabase.from('batches').insert({
    product_id: product.id,
    barcode,
    quantity: Number(quantity),
    purchase_price: Number(purchasePrice),
    selling_price: Number(price),
    expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null
  });

  // تسجيل المصروف
  await supabase.from('winnings').insert({
    amount: Number(purchasePrice) * Number(quantity),
    reason: `شراء ${quantity} علبة من ${name}`,
    transaction_type: 'out',
    date: new Date().toISOString()
  });

  await logActivity(null, {
    action: 'product_add',
    userId: user.userId || user.id,
    username: user.username,
    description: `إضافة منتج جديد: ${name}`,
    metadata: { productId: product.id }
  });

  return {
    success: true,
    message: `✅ تم إضافة ${name} بنجاح`,
    product: {
      _id: product.id,
      id: product.id,
      name: product.name,
      price: Number(price),
      quantity: Number(quantity)
    }
  };
}

async function updateProduct(user, { productId, updates }) {
  const { logActivity } = await import('@/app/lib/logActivity');

  // Map updates if needed (e.g., expiryDate to expiry_date)
  const mappedUpdates = { ...updates };
  if (mappedUpdates.expiryDate) {
    mappedUpdates.expiry_date = mappedUpdates.expiryDate;
    delete mappedUpdates.expiryDate;
  }
  if (mappedUpdates.isShortcoming !== undefined) {
    mappedUpdates.is_shortcoming = mappedUpdates.isShortcoming;
    delete mappedUpdates.isShortcoming;
  }

  const { data: product, error } = await supabase
    .from('products')
    .update(mappedUpdates)
    .eq('id', productId)
    .select()
    .single();

  if (error || !product) throw new Error('Product not found: ' + (error?.message || ''));

  await logActivity(null, {
    action: 'product_update',
    userId: user.userId || user.id,
    username: user.username,
    description: `تحديث المنتج: ${product.name}`,
    metadata: { productId, updates }
  });

  return {
    success: true,
    message: `✅ تم تحديث ${product.name}`,
    product: {
      _id: product.id,
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity
    }
  };
}

async function deleteProduct(user, { productId }) {
  const { logActivity } = await import('@/app/lib/logActivity');

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', productId)
    .single();

  if (!product) throw new Error('Product not found');

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  
  if (error) throw error;

  await logActivity(null, {
    action: 'product_delete',
    userId: user.userId || user.id,
    username: user.username,
    description: `حذف المنتج: ${product.name}`,
    metadata: { productId }
  });

  return {
    success: true,
    message: `✅ تم حذف ${product.name}`,
    productId
  };
}

async function sellProducts(user, { items, isSadaqah = false }) {
  const { logActivity } = await import('@/app/lib/logActivity');
  const { deductProductQuantity } = await import('@/app/lib/productHelpers');

  let totalAmount = 0;
  const reasons = [];

  for (const item of items) {
    let product;
    
    const { data: foundProd } = await supabase
        .from('products')
        .select('*')
        .or(`id.eq.${item.productId},name.eq.${item.productName}`)
        .single();
    
    product = foundProd;

    if (!product) {
      throw new Error(`المنتج "${item.productName || item.productId}" غير موجود`);
    }

    let qtyToDeduct = Number(item.quantity);
    if (item.unit && item.unit !== product.unit && product.unit_conversion) {
      qtyToDeduct = item.quantity / product.unit_conversion;
    }

    // Use product helper to deduct quantity and handle batches
    await deductProductQuantity(product.id, qtyToDeduct, product.inventory_method || 'FEFO');

    totalAmount += qtyToDeduct * (product.price || 0); // Need to ensure price exists
    reasons.push(`${item.quantity} ${item.unit || product.unit} ${product.name}`);
  }

  // Record winning
  await supabase.from('winnings').insert({
    amount: totalAmount,
    reason: reasons.join(' و '),
    transaction_type: isSadaqah ? 'sadaqah' : 'in',
    date: new Date().toISOString()
  });

  await logActivity(null, {
    action: 'sale',
    userId: user.userId || user.id,
    username: user.username,
    description: `بيع بقيمة ${totalAmount} ج.م`,
    metadata: { items, totalAmount, isSadaqah }
  });

  return {
    success: true,
    message: `✅ تم البيع بقيمة ${totalAmount} ج.م`,
    totalAmount
  };
}

async function restockProducts(user, { items, supplier, invoiceNumber }) {
  const { logActivity } = await import('@/app/lib/logActivity');

  let totalCost = 0;
  const reasons = [];

  for (const item of items) {
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .or(`id.eq.${item.productId},name.eq.${item.productName}`)
        .single();

    if (!product) {
      throw new Error(`المنتج "${item.productName || item.productId}" غير موجود`);
    }

    // Add batch
    await supabase.from('batches').insert({
        product_id: product.id,
        quantity: Number(item.quantity),
        purchase_price: Number(product.purchase_price || 0),
        supplier,
        invoice_number: invoiceNumber,
        purchase_date: new Date().toISOString()
    });

    totalCost += Number(item.quantity) * Number(product.purchase_price || 0);
    reasons.push(`${item.quantity} ${product.unit} ${product.name}`);
  }

  await supabase.from('winnings').insert({
    amount: totalCost,
    reason: `شراء ${reasons.join(' و ')}`,
    transaction_type: 'out',
    supplier,
    date: new Date().toISOString()
  });

  await logActivity(null, {
    action: 'product_add',
    userId: user.userId || user.id,
    username: user.username,
    description: `تزويد مخزون بـ ${items.length} منتج`,
    metadata: { items, totalCost }
  });

  return {
    success: true,
    message: `✅ تم تزويد المخزون بنجاح`,
    totalCost
  };
}