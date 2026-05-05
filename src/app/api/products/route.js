import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';
import { treatmentTypes } from '@/app/lib/unitOptions';
import { supabase } from '@/app/lib/supabase';
import { logActivity } from '@/app/lib/logActivity';
import { updateProductShortcomingStatus } from '@/app/lib/productHelpers';

// ============================================================
// POST - إضافة دفعة جديدة لمنتج (أو إنشاء منتج جديد مع دفعة)
// ============================================================
export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "يجب إرسال قائمة دفعات صحيحة." }, { status: 400 });
    }

    const addedBatches = [];
    let totalCost = 0;
    const reasonParts = [];

    for (const batchData of body) {
      let {
        name, type, quantity, barcode, unitConversion, expiryDate,
        purchasePrice, salePrice, company, details, supplier, invoiceNumber, isGift
      } = batchData;

      if (!name || quantity === undefined) throw new Error("اسم المنتج والكمية مطلوبان.");

      const parsedQuantity = Number(quantity);
      const parsedPurchasePrice = isGift ? 0 : Number(purchasePrice);
      const parsedSalePrice = isGift ? 0 : Number(salePrice);

      // 1. Find or create product
      let { data: product, error: findError } = await supabase
        .from('products')
        .select('*')
        .eq('name', name.trim())
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;

      if (!product) {
        const typeDef = treatmentTypes.find(t => t.name === type);
        if (!typeDef) throw new Error(`النوع "${type}" غير معروف.`);

        // Create product
        const { data: newProd, error: createError } = await supabase
          .from('products')
          .insert({
            name: name.trim(),
            type: type || 'دواء عادي برشام',
            unit: typeDef.baseUnit,
            unit_conversion: unitConversion ? Number(unitConversion) : 1,
            company: company || 'غير محدد',
            details: details || '',
            inventory_method: 'FEFO',
            low_stock_threshold: 5
          })
          .select()
          .single();

        if (createError) throw createError;
        product = newProd;
      }

      // 2. Add batch
      const finalBarcode = barcode || `BATCH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const { data: batch, error: bError } = await supabase
        .from('batches')
        .insert({
          product_id: product.id,
          batch_number: `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          barcode: finalBarcode,
          quantity: parsedQuantity,
          purchase_price: parsedPurchasePrice,
          selling_price: parsedSalePrice,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          supplier: supplier || null,
          invoice_number: invoiceNumber || null,
          notes: isGift ? 'هدية / بونص' : null,
          is_active: true
        })
        .select()
        .single();
      
      if (bError) throw bError;

      totalCost += isGift ? 0 : (parsedQuantity * parsedPurchasePrice);
      addedBatches.push({ 
        productName: product.name, 
        batchNumber: batch.batch_number, 
        barcode: batch.barcode, 
        quantity: batch.quantity 
      });
      reasonParts.push(`${parsedQuantity} ${product.unit} ${product.name}${isGift ? ' (هدية)' : ''}`);

      await updateProductShortcomingStatus(product.id);
    }

    // 3. Register Winning/Loss (Transaction)
    if (totalCost >= 0) {
      const { error: winError } = await supabase
        .from('winnings')
        .insert({
          amount: totalCost,
          reason: totalCost > 0 ? `شراء ${addedBatches.length} دفعة: ${reasonParts.join(" و ")}` : `إضافة بونص/هدية: ${reasonParts.join(" و ")}`,
          transaction_type: 'out',
          invoice_number: body[0]?.invoiceNumber || null,
          supplier: body[0]?.supplier || null,
          date: new Date().toISOString(),
          metadata: { batches: addedBatches, totalCost, isGift: totalCost === 0 }
        });
      if (winError) console.error("Winning record error:", winError);
    }

    // 4. Log Activity
    await logActivity(null, {
      action: 'product_add',
      userId: user.userId,
      username: user.username,
      description: `إضافة ${addedBatches.length} دفعة جديدة`,
      metadata: { batchesCount: addedBatches.length, totalCost, batches: addedBatches }
    });

    return NextResponse.json({
      success: true,
      message: `تمت إضافة ${addedBatches.length} دفعة بنجاح`,
      batches: addedBatches
    }, { status: 201 });

  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ============================================================
// GET - جلب جميع المنتجات مع دفعاتهم
// ============================================================
export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { data: products, error } = await supabase
      .from('products')
      .select('*, batches(*)')
      .order('name', { ascending: true });

    if (error) throw error;
    
    const formattedProducts = products.map(product => {
      const activeBatches = product.batches.filter(b => b.is_active && b.quantity > 0);
      const totalQuantity = activeBatches.reduce((sum, b) => sum + Number(b.quantity), 0);

      return {
        _id: product.id,
        name: product.name,
        type: product.type,
        unit: product.unit,
        unitConversion: product.unit_conversion,
        company: product.company,
        details: product.details,
        inventoryMethod: product.inventory_method,
        lowStockThreshold: product.low_stock_threshold,
        isShortcoming: product.is_shortcoming,
        totalQuantity: totalQuantity,
        batches: product.batches.map(batch => ({
          id: batch.id,
          batchNumber: batch.batch_number,
          barcode: batch.barcode,
          quantity: batch.quantity,
          purchasePrice: batch.purchase_price,
          sellingPrice: batch.selling_price,
          expiryDate: batch.expiry_date,
          purchaseDate: batch.purchase_date,
          supplier: batch.supplier,
          invoiceNumber: batch.invoice_number,
          isActive: batch.is_active,
          daysUntilExpiry: Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
        }))
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("GET products error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ============================================================
// PATCH - تحديث منتج أو دفعة
// ============================================================
export async function PATCH(request) {
  try {
    const user = await verifyToken(request.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { mode, product, batchId, adjustmentReason } = await request.json();
    if (!product?.id && !product?._id && !product?.name) {
      return NextResponse.json({ success: false, message: "Missing product id or name" }, { status: 400 });
    }

    const productId = product.id || product._id;
    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('*, batches(*)')
      .eq(productId ? 'id' : 'name', productId ? productId : product.name.trim())
      .single();
    
    if (findError || !existing) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    // ============================================================
    // تحديث دفعة معينة
    // ============================================================
    if (mode === "update_batch" && batchId) {
      const batch = existing.batches.find(b => b.id === batchId);
      if (!batch) return NextResponse.json({ success: false, message: "Batch not found" }, { status: 404 });

      const oldQuantity = batch.quantity;
      const updates = {
        quantity: product.quantity !== undefined ? Number(product.quantity) : batch.quantity,
        selling_price: product.sellingPrice !== undefined ? Number(product.sellingPrice) : batch.selling_price,
        purchase_price: product.purchasePrice !== undefined ? Number(product.purchasePrice) : batch.purchase_price,
        expiry_date: product.expiryDate !== undefined ? new Date(product.expiryDate).toISOString() : batch.expiry_date,
        is_active: product.isActive !== undefined ? product.isActive : batch.is_active
      };

      const { error: updateError } = await supabase.from('batches').update(updates).eq('id', batchId);
      if (updateError) throw updateError;

      const totalQty = await updateProductShortcomingStatus(existing.id);

      // تسجيل التغييرات المالية
      const qtyDiff = updates.quantity - oldQuantity;
      if (qtyDiff !== 0 && !product.isGift) {
        const isLoss = qtyDiff < 0 && (adjustmentReason === 'burnt' || adjustmentReason === 'damaged' || adjustmentReason === 'expired');
        
        await supabase.from('winnings').insert({
          amount: Math.abs(qtyDiff * updates.purchase_price),
          reason: `تعديل كمية دفعة ${batch.batch_number} للمنتج "${existing.name}": ${adjustmentReason || (qtyDiff > 0 ? 'زيادة' : 'نقص')} بمقدار ${Math.abs(qtyDiff)} ${existing.unit}`,
          transaction_type: (qtyDiff > 0 || isLoss) ? 'out' : 'in',
          invoice_number: product.invoiceNumber || null,
          supplier: product.supplier || null,
          date: new Date().toISOString(),
          metadata: { productId: existing.id, batchId, oldQuantity, newQuantity: updates.quantity, qtyDiff }
        });
      }

      await logActivity(null, {
        action: 'product_update',
        userId: user.userId,
        username: user.username,
        description: `تحديث دفعة ${batch.batch_number} للمنتج "${existing.name}"`,
        metadata: { productName: existing.name, batchNumber: batch.batch_number, oldQuantity, newQuantity: updates.quantity, adjustmentReason }
      });

      return NextResponse.json({ success: true, product: existing });
    }

    // ============================================================
    // جرد كامل للمنتج
    // ============================================================
    if (mode === "inventory" || mode === "update") {
        const activeBatches = existing.batches.filter(b => b.is_active && b.quantity > 0);
        const oldTotal = activeBatches.reduce((sum, b) => sum + Number(b.quantity), 0);
        const newTotal = Number(product.quantity);
        const qtyDiff = newTotal - oldTotal;

        if (qtyDiff !== 0) {
            if (qtyDiff > 0) {
                // زيادة: إضافة دفعة جديدة
                await supabase.from('batches').insert({
                    product_id: existing.id,
                    batch_number: `INVENTORY-${Date.now()}`,
                    barcode: `INV-${Date.now()}`,
                    quantity: qtyDiff,
                    purchase_price: product.purchasePrice || activeBatches[0]?.purchase_price || 0,
                    selling_price: product.price || activeBatches[0]?.selling_price || 0,
                    expiry_date: product.expiryDate ? new Date(product.expiryDate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    supplier: product.supplier || null,
                    invoice_number: product.invoiceNumber || null,
                    is_active: true,
                    notes: `جرد: زيادة ${qtyDiff}`
                });
            } else {
                // نقص: خصم من الدفعات (استخدام الهيلبر)
                const { deductProductQuantity } = await import('@/app/lib/productHelpers');
                await deductProductQuantity(existing.id, Math.abs(qtyDiff), existing.inventory_method);
            }
        }

        const productUpdates = {
            name: product.name || existing.name,
            type: product.type || existing.type,
            company: product.company || existing.company,
            details: product.details !== undefined ? product.details : existing.details,
            inventory_method: product.inventoryMethod || existing.inventory_method,
            low_stock_threshold: product.lowStockThreshold || existing.low_stock_threshold
        };

        await supabase.from('products').update(productUpdates).eq('id', existing.id);
        await updateProductShortcomingStatus(existing.id);

        if (qtyDiff !== 0) {
            const batchPrice = activeBatches[0]?.purchase_price || 0;
            await supabase.from('winnings').insert({
                amount: Math.abs(qtyDiff * batchPrice),
                reason: `جرد للمنتج "${existing.name}": ${qtyDiff > 0 ? 'زيادة' : 'نقص'} بمقدار ${Math.abs(qtyDiff)} ${existing.unit}`,
                transaction_type: qtyDiff > 0 ? 'out' : 'in',
                invoice_number: product.invoiceNumber || null,
                supplier: product.supplier || null,
                date: new Date().toISOString(),
                metadata: { productId: existing.id, oldTotal, newTotal, qtyDiff }
            });
        }

        await logActivity(null, {
            action: 'product_update',
            userId: user.userId,
            username: user.username,
            description: `جرد المنتج "${existing.name}"`,
            metadata: { productName: existing.name, oldTotal, newTotal, qtyDiff, adjustmentReason }
        });

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Invalid mode" }, { status: 400 });

  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// ============================================================
// DELETE - حذف منتج كامل (كل دفعاته)
// ============================================================
export async function DELETE(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const batchId = searchParams.get("batchId");

    if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });

    const { data: product, error: findError } = await supabase
        .from('products')
        .select('*, batches(*)')
        .eq('id', id)
        .single();

    if (findError || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    if (batchId) {
      const batch = product.batches.find(b => b.id === batchId);
      if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

      const stockValue = batch.quantity * batch.purchase_price;
      
      await supabase.from('batches').delete().eq('id', batchId);
      await updateProductShortcomingStatus(id);

      if (stockValue > 0) {
        await supabase.from('winnings').insert({
          amount: stockValue,
          reason: `حذف دفعة ${batch.batch_number} من المنتج "${product.name}" (الكمية كانت: ${batch.quantity})`,
          transaction_type: 'out',
          date: new Date().toISOString(),
          metadata: { productId: id, batchId, batchNumber: batch.batch_number, quantity: batch.quantity, stockValue }
        });
      }

      await logActivity(null, {
        action: 'product_delete',
        userId: user.userId,
        username: user.username,
        description: `حذف دفعة ${batch.batch_number} من المنتج "${product.name}"`,
        metadata: { productName: product.name, batchNumber: batch.batch_number, quantity: batch.quantity, stockValue }
      });

      return NextResponse.json({ success: true, message: `تم حذف الدفعة بنجاح` });
    }

    // حذف المنتج بالكامل
    const totalStockValue = product.batches.reduce((sum, b) => sum + (b.quantity * b.purchase_price), 0);
    await supabase.from('products').delete().eq('id', id);

    if (totalStockValue > 0) {
      await supabase.from('winnings').insert({
        amount: totalStockValue,
        reason: `حذف منتج من النظام مع مخزون متبقي: "${product.name}"`,
        transaction_type: 'out',
        date: new Date().toISOString(),
        metadata: { productId: id, name: product.name, totalStockValue }
      });
    }

    await logActivity(null, {
      action: 'product_delete',
      userId: user.userId,
      username: user.username,
      description: `حذف المنتج "${product.name}"`,
      metadata: { productName: product.name, totalStockValue }
    });

    return NextResponse.json({ success: true, message: "تم حذف المنتج بنجاح" });

  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}