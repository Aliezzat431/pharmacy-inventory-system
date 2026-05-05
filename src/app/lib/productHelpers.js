import { supabase } from './supabase';

/**
 * Get all batches for a product sorted by inventory method
 * @param {string} productId 
 * @param {string} method FEFO | FIFO | LIFO
 */
export async function getSortedBatches(productId, method = 'FEFO') {
    let query = supabase
        .from('batches')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .gt('quantity', 0);

    switch (method) {
        case 'FEFO':
            query = query.order('expiry_date', { ascending: true });
            break;
        case 'FIFO':
            query = query.order('purchase_date', { ascending: true });
            break;
        case 'LIFO':
            query = query.order('purchase_date', { ascending: false });
            break;
        default:
            query = query.order('expiry_date', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Deduct quantity from batches based on inventory method
 * @param {string} productId 
 * @param {number} quantityToDeduct 
 * @param {string} method 
 * @param {string} specificBarcode 
 */
export async function deductProductQuantity(productId, quantityToDeduct, method = 'FEFO', specificBarcode = null) {
    if (quantityToDeduct <= 0) throw new Error('الكمية يجب أن تكون أكبر من صفر');

    let batches = [];
    
    if (specificBarcode) {
        const { data, error } = await supabase
            .from('batches')
            .select('*')
            .eq('product_id', productId)
            .eq('barcode', specificBarcode)
            .eq('is_active', true)
            .single();
        
        if (error || !data) throw new Error('الباركود غير موجود أو الدفعة غير نشطة');
        batches = [data];
    } else {
        batches = await getSortedBatches(productId, method);
    }

    let remaining = quantityToDeduct;
    const processedBatches = [];
    const updates = [];

    for (const batch of batches) {
        if (remaining <= 0) break;
        
        const deduct = Math.min(batch.quantity, remaining);
        const newQty = batch.quantity - deduct;
        
        processedBatches.push({
            batchId: batch.id,
            batchNumber: batch.batch_number,
            barcode: batch.barcode,
            quantity: deduct,
            purchasePrice: batch.purchase_price,
            sellingPrice: batch.selling_price
        });

        updates.push(
            supabase
                .from('batches')
                .update({ 
                    quantity: newQty,
                    is_active: newQty > 0 
                })
                .eq('id', batch.id)
        );

        remaining -= deduct;
    }

    if (remaining > 0) {
        throw new Error('الكمية المطلوبة أكبر من المتوفر في المخزون');
    }

    // Execute all updates
    const results = await Promise.all(updates);
    for (const res of results) {
        if (res.error) throw res.error;
    }

    // Check if product is low stock
    await updateProductShortcomingStatus(productId);

    const totalCost = processedBatches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    const totalRevenue = processedBatches.reduce((sum, b) => sum + (b.quantity * b.sellingPrice), 0);

    return {
        batches: processedBatches,
        totalCost,
        totalRevenue,
        profit: totalRevenue - totalCost
    };
}

/**
 * Update the is_shortcoming flag for a product based on its total quantity
 */
export async function updateProductShortcomingStatus(productId) {
    // 1. Get product threshold
    const { data: product, error: pError } = await supabase
        .from('products')
        .select('low_stock_threshold')
        .eq('id', productId)
        .single();
    
    if (pError) return;

    // 2. Get sum of quantities
    const { data: batches, error: bError } = await supabase
        .from('batches')
        .select('quantity')
        .eq('product_id', productId)
        .eq('is_active', true);
    
    if (bError) return;

    const totalQty = batches.reduce((sum, b) => sum + Number(b.quantity), 0);
    const isShortcoming = totalQty < (product.low_stock_threshold || 5);

    await supabase
        .from('products')
        .update({ is_shortcoming: isShortcoming })
        .eq('id', productId);
    
    return totalQty;
}
