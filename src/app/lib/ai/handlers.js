import { callInternalAPI } from "./utils";

// Helper function for user-friendly error messages
function getUserFriendlyError(error, operation) {
    const errorMsg = error.message || error.toString();

    if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        return `عذراً، لم أجد ${operation}. ممكن تتأكد من البيانات وتحاول تاني؟`;
    }
    if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
        return 'عذراً، فيه مشكلة في الصلاحيات. ممكن تسجل دخول تاني؟';
    }
    if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
        return `فيه خطأ في البيانات اللي دخلتها. ممكن تراجع ${operation} وتحاول تاني؟`;
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        return 'فيه مشكلة في الاتصال بالسيرفر. تأكد من الإنترنت وحاول تاني.';
    }

    return `عذراً، حصل خطأ أثناء ${operation}: ${errorMsg}`;
}

export async function handleSearchProducts(token, args) {
    try {
        const query = args.query || '';
        const data = await callInternalAPI(`/api/search?q=${encodeURIComponent(query)}`, 'GET', token);
        return data.products || [];
    } catch (error) {
        throw new Error(getUserFriendlyError(error, 'البحث عن المنتجات'));
    }
}

export async function handleCheckLowStock(token) {
    try {
        const data = await callInternalAPI('/api/search?mode=shortcomings', 'GET', token);
        return (data.products || []).map(p => ({
            name: p.name,
            quantity: p.quantity,
            unit: p.unit,
            isShortcoming: p.isShortcoming
        }));
    } catch (error) {
        throw new Error(getUserFriendlyError(error, 'عرض المنتجات الناقصة'));
    }
}

export async function handleCreateProduct(token, args) {
    // ✅ التحقق من البيانات الناقصة أولاً
    const missingFields = [];
    
    if (!args.name) missingFields.push("اسم المنتج");
    if (!args.price) missingFields.push("سعر البيع");
    if (!args.purchasePrice) missingFields.push("سعر الشراء");
    if (!args.barcode) missingFields.push("الباركود");
    if (!args.company) missingFields.push("الشركة");
    
    if (missingFields.length > 0) {
        return {
            status: "request_info",
            title: "بيانات المنتج الناقصة",
            description: `كمل البيانات دي عشان أقدر أضيف المنتج:`,
            fields: [
                ...(!args.name ? [{
                    name: "name",
                    label: "اسم المنتج",
                    type: "text",
                    placeholder: "مثال: بانادول",
                    required: true
                }] : []),
                ...(!args.price ? [{
                    name: "price",
                    label: "سعر البيع",
                    type: "number",
                    placeholder: "مثال: 45",
                    required: true,
                    min: 0
                }] : []),
                ...(!args.purchasePrice ? [{
                    name: "purchasePrice",
                    label: "سعر الشراء",
                    type: "number",
                    placeholder: "مثال: 40",
                    required: true,
                    min: 0
                }] : []),
                ...(!args.barcode ? [{
                    name: "barcode",
                    label: "الباركود",
                    type: "text",
                    placeholder: "مثال: 123456",
                    required: true
                }] : []),
                ...(!args.company ? [{
                    name: "company",
                    label: "الشركة",
                    type: "text",
                    placeholder: "مثال: GSK",
                    required: true
                }] : [])
            ],
            originalArgs: args
        };
    }

    const productArray = [{
        name: args.name,
        type: args.type || 'دواء عادي برشام',
        quantity: args.quantity || 0,
        barcode: args.barcode || '',
        unitConversion: args.unitConversion || null,
        expiryDate: args.expiryDate || null,
        purchasePrice: args.purchasePrice || 0,
        salePrice: args.price,
        company: args.company || 'غير محدد',
        details: args.details || ''
    }];

    try {
        const result = await callInternalAPI('/api/products', 'POST', token, productArray);

        return {
            message: result.message || "تمت إضافة المنتج بنجاح ✅",
            product: {
                name: result.createdProducts?.[0]?.name,
                price: result.createdProducts?.[0]?.price,
                quantity: result.createdProducts?.[0]?.quantity,
                unit: result.createdProducts?.[0]?.unit,
                company: result.createdProducts?.[0]?.company
            },
            undoData: {
                operationType: 'create_product',
                entityType: 'product',
                productId: result.createdProducts?.[0]?._id
            }
        };
    } catch (error) {
        // لو الخطأ إن المنتج موجود
        if (error.message.includes('already exists') || error.message.includes('موجود')) {
            return {
                status: "request_info",
                title: "المنتج موجود بالفعل",
                description: "المنتج ده موجود في المخزون. عايز تزود الكمية ولا تروح لصفحة المخزون؟",
                fields: [
                    {
                        name: "quantity",
                        label: "الكمية المطلوب تزويدها",
                        type: "number",
                        placeholder: "مثال: 10",
                        required: true,
                        min: 1
                    }
                ],
                originalArgs: { ...args, action: "restock" }
            };
        }
        throw new Error(getUserFriendlyError(error, 'إضافة المنتج'));
    }
}

export async function handleUpdateProduct(token, args) {
    const { productId, mode = 'inventory', ...updates } = args;

    // ✅ لو معرفش الـ productId
    if (!productId && !updates.name) {
        return {
            status: "request_info",
            title: "تحديد المنتج",
            description: "أدخل اسم المنتج اللي عايز تعدله:",
            fields: [
                {
                    name: "name",
                    label: "اسم المنتج",
                    type: "text",
                    placeholder: "مثال: بانادول",
                    required: true
                }
            ],
            originalArgs: args
        };
    }

    // ✅ البحث عن المنتج لو معرفش الـ ID
    let targetProductId = productId;
    if (!targetProductId && updates.name) {
        try {
            const searchRes = await callInternalAPI(`/api/search?q=${encodeURIComponent(updates.name)}`, 'GET', token);
            if (searchRes.products?.length === 1) {
                targetProductId = searchRes.products[0]._id;
            } else if (searchRes.products?.length > 1) {
                return {
                    status: "request_info",
                    title: "اختر المنتج",
                    description: "لقيت أكتر من منتج بنفس الاسم. اختار المنتج الصح:",
                    fields: [
                        {
                            name: "productId",
                            label: "المنتج",
                            type: "select",
                            options: searchRes.products.map(p => ({
                                value: p._id,
                                label: `${p.name} - ${p.company} - ${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('ar-EG') : 'بدون صلاحية'}`
                            })),
                            required: true
                        }
                    ],
                    originalArgs: args
                };
            } else {
                return {
                    status: "request_info",
                    title: "المنتج مش موجود",
                    description: "مفيش منتج بالاسم ده. عايز تضيفه جديد؟",
                    fields: [
                        {
                            name: "confirm",
                            label: "تأكيد الإضافة",
                            type: "checkbox",
                            required: true
                        }
                    ],
                    originalArgs: { ...args, action: "create" }
                };
            }
        } catch (e) {
            console.warn("Failed to search for product:", e);
        }
    }

    // Fetch current state before update for undo purposes
    let existingProduct = null;
    try {
        if (targetProductId) {
            const searchRes = await callInternalAPI(`/api/search?q=${encodeURIComponent(targetProductId)}`, 'GET', token);
            existingProduct = searchRes.products?.find(p => p._id === targetProductId);
        }
    } catch (e) {
        console.warn("Failed to fetch product for undo backup:", e);
    }

    const result = await callInternalAPI('/api/products', 'PATCH', token, {
        mode,
        product: { _id: targetProductId, ...updates, isGift: !!args.isGift },
        adjustmentReason: args.adjustmentReason
    });

    return {
        message: `تم تحديث المنتج بنجاح`,
        product: {
            name: result.product?.name,
            price: result.product?.price,
            quantity: result.product?.quantity,
            unit: result.product?.unit
        },
        undoData: {
            operationType: 'update_product',
            entityType: 'product',
            productId: targetProductId,
            previousState: existingProduct ? {
                name: existingProduct.name,
                type: existingProduct.type,
                price: existingProduct.price,
                purchasePrice: existingProduct.purchasePrice,
                quantity: existingProduct.quantity,
                unit: existingProduct.unit,
                barcode: existingProduct.barcode,
                company: existingProduct.company,
                expiryDate: existingProduct.expiryDate,
                details: existingProduct.details,
                unitConversion: existingProduct.unitConversion
            } : null
        }
    };
}

export async function handleDeleteProduct(token, args) {
    // ✅ لو معرفش الـ productId
    if (!args.productId && !args.name) {
        return {
            status: "request_info",
            title: "تحديد المنتج للحذف",
            description: "أدخل اسم المنتج اللي عايز تحذفه:",
            fields: [
                {
                    name: "name",
                    label: "اسم المنتج",
                    type: "text",
                    placeholder: "مثال: بانادول",
                    required: true
                }
            ],
            originalArgs: args
        };
    }

    // ✅ البحث عن المنتج لو معرفش الـ ID
    let targetProductId = args.productId;
    if (!targetProductId && args.name) {
        try {
            const searchRes = await callInternalAPI(`/api/search?q=${encodeURIComponent(args.name)}`, 'GET', token);
            if (searchRes.products?.length === 1) {
                targetProductId = searchRes.products[0]._id;
            } else if (searchRes.products?.length > 1) {
                return {
                    status: "request_info",
                    title: "اختر المنتج للحذف",
                    description: "لقيت أكتر من منتج بنفس الاسم. اختار المنتج اللي عايز تحذفه:",
                    fields: [
                        {
                            name: "productId",
                            label: "المنتج",
                            type: "select",
                            options: searchRes.products.map(p => ({
                                value: p._id,
                                label: `${p.name} - ${p.company} - ${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('ar-EG') : 'بدون صلاحية'}`
                            })),
                            required: true
                        }
                    ],
                    originalArgs: args
                };
            } else {
                return {
                    status: "request_info",
                    title: "المنتج مش موجود",
                    description: "مفيش منتج بالاسم ده عشان تحذفه.",
                    fields: [],
                    originalArgs: args
                };
            }
        } catch (e) {
            console.warn("Failed to search for product:", e);
        }
    }

    // Fetch full product details before deletion for undo
    let productBackup = null;
    try {
        if (targetProductId) {
            const searchRes = await callInternalAPI(`/api/search?q=${encodeURIComponent(targetProductId)}`, 'GET', token);
            productBackup = searchRes.products?.find(p => p._id === targetProductId);
        }
    } catch (e) {
        console.warn("Failed to backup product for undo:", e);
    }

    const result = await callInternalAPI(`/api/products?id=${targetProductId}`, 'DELETE', token);

    return {
        message: result.message || 'تم حذف المنتج',
        undoData: {
            operationType: 'delete_product',
            entityType: 'product',
            productId: targetProductId,
            productData: productBackup
        }
    };
}

export async function handleSellProducts(token, args) {
    const { items } = args;

    // ✅ التحقق من وجود الكمية
    for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
            return {
                status: "request_info",
                title: "تحديد الكمية",
                description: `كام وحدة من ${item.productName || 'المنتج'} عايز تبيع؟`,
                fields: [
                    {
                        name: "quantity",
                        label: "الكمية",
                        type: "number",
                        placeholder: "مثال: 2",
                        required: true,
                        min: 1
                    }
                ],
                originalArgs: args,
                currentItem: item
            };
        }
    }

    const checkoutItems = items.map(item => ({
        _id: item.productId,
        name: item.productName || item.productId,
        unit: item.unit || 'علبة',
        quantity: item.quantity
    }));

    const result = await callInternalAPI('/api/checkout', 'POST', token, {
        items: checkoutItems,
        isSadaqah: false
    });

    return {
        message: `تم بيع المنتجات بنجاح (الإجمالي: ${result.totalAmount} ج.م)`,
        totalAmount: result.totalAmount,
        undoData: {
            operationType: 'sell_products',
            entityType: 'transaction',
            items: checkoutItems
        }
    };
}

export async function handleRestockProducts(token, args, context = {}) {
    const { items } = args;

    console.log('🔍 Restock items received:', JSON.stringify(items, null, 2));

    // ✅ التحقق من وجود الكمية
    for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
            return {
                status: "request_info",
                title: "تحديد الكمية للتزويد",
                description: `كام علبة من ${item.name || 'المنتج'} عايز تزود؟`,
                fields: [
                    {
                        name: "quantity",
                        label: "الكمية",
                        type: "number",
                        placeholder: "مثال: 10",
                        required: true,
                        min: 1
                    }
                ],
                originalArgs: args,
                productName: item.name || context?.pendingRestock?.productName
            };
        }
    }

    const productArray = items.map(item => ({
        name: item.name || item.productName,
        quantity: item.quantity,
        isGift: !!item.isGift
    }));

    console.log('📦 Final restock payload:', JSON.stringify(productArray, null, 2));

    try {
        const result = await callInternalAPI('/api/products', 'POST', token, productArray);

        return {
            message: result.message || 'تم تزويد المخزون بنجاح',
            products: (result.createdProducts || []).map(p => ({
                name: p.name,
                price: p.price,
                quantity: p.quantity,
                unit: p.unit
            })),
            undoData: {
                operationType: 'restock_products',
                entityType: 'transaction',
                items: productArray.map(p => ({
                    name: p.name,
                    quantity: p.quantity,
                    isGift: p.isGift
                }))
            }
        };
    } catch (error) {
        // لو الخطأ بسبب نقص بيانات
        if (error.message.includes('الكمية')) {
            return {
                status: "request_info",
                title: "الكمية مطلوبة",
                description: "كام علبة عايز تزود؟",
                fields: [
                    {
                        name: "quantity",
                        label: "الكمية",
                        type: "number",
                        placeholder: "مثال: 10",
                        required: true,
                        min: 1
                    }
                ],
                originalArgs: args
            };
        }
        throw new Error(error.message || 'حصل خطأ أثناء تزويد المخزون');
    }
}

export async function handleReturnProducts(token, args) {
    const { items } = args;

    // ✅ التحقق من وجود الكمية
    for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
            return {
                status: "request_info",
                title: "تحديد كمية المرتجع",
                description: `كام وحدة من ${item.name} عايز ترجع؟`,
                fields: [
                    {
                        name: "quantity",
                        label: "الكمية",
                        type: "number",
                        placeholder: "مثال: 2",
                        required: true,
                        min: 1
                    }
                ],
                originalArgs: args,
                currentItem: item
            };
        }
    }

    const returnItems = items.map(item => ({
        name: item.productName || item.name,
        unit: item.unit || 'علبة',
        quantity: item.quantity
    }));

    const result = await callInternalAPI('/api/returns', 'POST', token, { items: returnItems });

    return {
        message: result.message,
        items: returnItems,
        undoData: {
            operationType: 'return_products',
            entityType: 'transaction',
            items: returnItems
        }
    };
}

export async function handleCreateCompany(token, args) {
    if (!args.name) {
        return {
            status: "request_info",
            title: "اسم الشركة",
            description: "أدخل اسم الشركة الجديدة:",
            fields: [
                {
                    name: "name",
                    label: "اسم الشركة",
                    type: "text",
                    placeholder: "مثال: GSK",
                    required: true
                }
            ],
            originalArgs: args
        };
    }

    try {
        const result = await callInternalAPI('/api/companies', 'POST', token, { name: args.name });
        return {
            _id: result.id,
            name: result.name,
            message: `تم إنشاء الشركة: ${result.name}`,
            undoData: {
                operationType: 'create_company',
                entityType: 'company',
                companyId: result.id
            }
        };
    } catch (e) {
        // If company already exists, just return it (idempotency)
        if (e.message.includes('موجود بالفعل') || e.message.includes('Conflict')) {
            console.log("Company already exists, fetching details...");
            const companies = await callInternalAPI('/api/companies', 'GET', token);
            const existing = companies.find(c => c.name.trim() === args.name.trim());
            if (existing) {
                return {
                    _id: existing._id,
                    name: existing.name,
                    message: `الشركة "${existing.name}" موجودة بالفعل.`
                };
            }
        }
        throw e;
    }
}

export async function handleUpdateCompany(token, args) {
    if (!args.companyId && !args.name) {
        return {
            status: "request_info",
            title: "تحديث الشركة",
            description: "أدخل اسم الشركة الجديد:",
            fields: [
                {
                    name: "name",
                    label: "اسم الشركة",
                    type: "text",
                    placeholder: "مثال: GSK",
                    required: true
                }
            ],
            originalArgs: args
        };
    }

    const result = await callInternalAPI('/api/companies', 'PATCH', token, {
        id: args.companyId,
        name: args.name
    });
    return {
        _id: result.id,
        name: result.name,
        message: `تم تحديث الشركة: ${result.name}`,
        undoData: {
            operationType: 'update_company',
            entityType: 'company',
            companyId: result.id
        }
    };
}

export async function handleGetCompanies(token) {
    return await callInternalAPI('/api/companies', 'GET', token);
}

export async function handleGetDebtors(token) {
    return await callInternalAPI('/api/debt', 'GET', token);
}

export async function handleGetSalesStats(token) {
    const data = await callInternalAPI('/api/winnings?full=false', 'GET', token);
    const today = new Date().toISOString().split('T')[0];
    const todayData = data.find(d => d.date === today) || { totalIn: 0 };
    return { totalSales: todayData.totalIn, date: today };
}

export async function handleGetDailyWinnings(token) {
    return await callInternalAPI('/api/winnings?full=false', 'GET', token);
}

export async function handleGetFullWinnings(token) {
    return await callInternalAPI('/api/winnings?full=true', 'GET', token);
}

export async function handleGetStockAnalytics(token) {
    const products = await callInternalAPI('/api/products', 'GET', token);

    let totalValue = 0;
    let totalItems = 0;
    const typeSummary = {};

    products.forEach(p => {
        const qty = Number(p.quantity) || 0;
        const purchasePrice = Number(p.purchasePrice) || 0;
        totalValue += (qty * purchasePrice);
        totalItems += 1;

        typeSummary[p.type] = (typeSummary[p.type] || 0) + 1;
    });

    return {
        totalValue: Math.round(totalValue),
        totalItems,
        typeSummary,
        message: `المخزن فيه حالياً ${totalItems} صنف، بإجمالي قيمة شرائية حوالي ${Math.round(totalValue)} ج.م.`
    };
}

export async function handleGetExpiryReport(token, args) {
    const months = args.months || 3;
    const data = await callInternalAPI('/api/reports/inventory', 'GET', token);

    if (months === 3) {
        return {
            expiringSoon: data.data.expiringSoon,
            expired: data.data.expired
        };
    } else {
        const products = await callInternalAPI('/api/products', 'GET', token);
        const now = new Date();
        const limit = new Date();
        limit.setMonth(limit.getMonth() + months);

        const expiringSoon = products.filter(p => {
            if (!p.expiryDate) return false;
            const exp = new Date(p.expiryDate);
            return exp > now && exp <= limit;
        });

        return {
            monthsRequested: months,
            expiringSoon,
            expiredCount: data.data.expired.length
        };
    }
}

export async function handleUndoLastAction(token, args, undoData) {
    if (!undoData) {
        return { message: "عذراً، لم أجد عملية سابقة للتراجع عنها في هذه الجلسة." };
    }

    const { operationType } = undoData;
    let result;

    try {
        switch (operationType) {
            case 'sell_products':
                result = await callInternalAPI('/api/returns', 'POST', token, { items: undoData.items });
                return { message: "تم التراجع عن عملية البيع وإعادة الكميات للمخزون بنجاح." };

            case 'restock_products':
                for (const item of undoData.items) {
                    const search = await callInternalAPI(`/api/search?q=${encodeURIComponent(item.name)}`, 'GET', token);
                    const p = search.products?.find(prod => prod.name === item.name);
                    if (p) {
                        const newQty = Math.max(0, p.quantity - item.quantity);
                        await callInternalAPI('/api/products', 'PATCH', token, {
                            mode: 'update',
                            product: { _id: p._id, quantity: newQty },
                            adjustmentReason: 'missing'
                        });
                    }
                }
                return { message: "تم التراجع عن الـ Restock وخصم الكميات اللي اتضافت من المخزن." };

            case 'update_product':
                if (undoData.previousState) {
                    await callInternalAPI('/api/products', 'PATCH', token, {
                        mode: 'update',
                        product: { _id: undoData.productId, ...undoData.previousState }
                    });
                    return { message: "تم التراجع عن التعديل واسترجاع بيانات المنتج السابقة." };
                }
                return { message: "عذراً، بيانات المنتج السابقة مش متوفرة للتراجع." };

            case 'create_product':
                result = await callInternalAPI(`/api/products?id=${undoData.productId}`, 'DELETE', token);
                return { message: "تم التراجع عن إنشاء المنتج وحذفه من النظام." };

            case 'delete_product':
                if (undoData.productData) {
                    await callInternalAPI('/api/products', 'POST', token, [undoData.productData]);
                    return { message: "تم التراجع عن الحذف وإعادة إضافة المنتج للنظام مرة تانية." };
                }
                return { message: "عذراً، بيانات المنتج المحذوف مش متوفرة عشان أرجعه." };

            default:
                return { message: `لا يدعم النظام حالياً التراجع عن عملية من نوع: ${operationType}` };
        }
    } catch (e) {
        console.error("Undo Error:", e);
        return { error: `فشل التراجع: ${e.message}` };
    }
}

export async function handleGetEmployees(token) {
    const data = await callInternalAPI('/api/employees', 'GET', token);
    return data.employees || [];
}

export async function handleRecordPayrollPayment(token, args) {
    const { employeeName, totalAmount, reason, fundingSources } = args;

    const result = await callInternalAPI('/api/salaries', 'POST', token, {
        employeeName,
        totalAmount,
        reason,
        fundingSources
    });

    return {
        message: result.message,
        totalAmount,
        undoData: {
            operationType: 'payroll_payment',
            entityType: 'transaction',
            fundingSources
        }
    };
}

export async function handleClearChatHistory(token) {
    try {
        await callInternalAPI('/api/chat', 'DELETE', token);
        return { message: "تم مسح سجل المحادثة. سأبدأ الآن بذاكرة فارغة." };
    } catch (e) {
        console.error("Clear History Error:", e);
        return { error: `فشل مسح السجل: ${e.message}` };
    }
}

export async function handleRequestInfo(token, args) {
    return {
        status: "waiting_for_user_input",
        ...args
    };
}

export async function handleSplitProduct(token, args) {
    const { productId, newBatches } = args;

    if (!productId) {
        return {
            status: "request_info",
            title: "تحديد المنتج للتجزئة",
            description: "أدخل اسم المنتج اللي عايز تجزئه:",
            fields: [
                {
                    name: "productName",
                    label: "اسم المنتج",
                    type: "text",
                    placeholder: "مثال: بانادول",
                    required: true
                }
            ],
            originalArgs: args
        };
    }

    const searchRes = await callInternalAPI(`/api/search?q=${encodeURIComponent(productId)}`, 'GET', token);
    const sourceProduct = searchRes.products?.find(p => p._id === productId);

    if (!sourceProduct) {
        throw new Error("لم أجد المنتج الأصلي المراد تجزئته.");
    }

    if (!newBatches || newBatches.length === 0) {
        return {
            status: "request_info",
            title: "بيانات الدفعات الجديدة",
            description: `أدخل تفاصيل الدفعات الجديدة للمنتج "${sourceProduct.name}":`,
            fields: [
                {
                    name: "batches",
                    label: "عدد الدفعات",
                    type: "number",
                    placeholder: "مثال: 2",
                    required: true,
                    min: 1
                }
            ],
            originalArgs: args,
            sourceProduct
        };
    }

    const totalToPull = newBatches.reduce((acc, b) => acc + b.quantity, 0);

    if (totalToPull > sourceProduct.quantity) {
        throw new Error(`الكمية المراد تجزئتها (${totalToPull}) أكبر من المتاح في الصنف الأصلي (${sourceProduct.quantity}).`);
    }

    const newSourceQty = sourceProduct.quantity - totalToPull;
    await callInternalAPI('/api/products', 'PATCH', token, {
        mode: 'inventory',
        product: { _id: productId, quantity: newSourceQty },
        adjustmentReason: 'inventory'
    });

    const productsToCreate = newBatches.map(batch => ({
        name: sourceProduct.name,
        type: sourceProduct.type,
        quantity: batch.quantity,
        barcode: sourceProduct.barcode,
        expiryDate: batch.expiryDate,
        purchasePrice: sourceProduct.purchasePrice,
        salePrice: sourceProduct.price,
        company: sourceProduct.company,
        unitConversion: sourceProduct.unitConversion,
        details: sourceProduct.details
    }));

    const result = await callInternalAPI('/api/products', 'POST', token, productsToCreate);

    return {
        message: `تم تقسيم المنتج "${sourceProduct.name}" بنجاح. الكمية المتبقية في الدفعة الأصلية: ${newSourceQty}.`,
        details: {
            originalRemaining: newSourceQty,
            newBatchesCreated: result.createdProducts?.length
        },
        undoData: {
            operationType: 'split_product',
            sourceId: productId,
            totalPulled: totalToPull,
            newBatchIds: result.createdProducts?.map(p => p.fullProduct?._id)
        }
    };
}