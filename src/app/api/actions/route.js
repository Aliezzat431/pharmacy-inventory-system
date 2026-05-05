import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

// --- Action Implementations ---

async function updateProduct(pharmacyId, args) {
    const productId = args.productId || args._id || args.id;

    if (!productId) {
        throw new Error("Product ID is required for update.");
    }

    const updateData = { ...args };
    delete updateData._id;
    delete updateData.id;
    delete updateData.productId;
    delete updateData.batches; // Don't update batches here if they exist

    Object.keys(updateData).forEach(
        key => updateData[key] === undefined && delete updateData[key]
    );

    const { data: product, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

    if (error || !product) throw new Error("Product not found or update failed: " + (error?.message || ""));

    return {
        success: true,
        message: `Updated product ${product.name}`,
        data: product
    };
}

async function deleteProduct(pharmacyId, args) {
    const productId = args._id || args.id;
    if (!productId) throw new Error("Product ID is required for deletion.");

    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

    if (fetchError || !product) throw new Error("Product not found.");

    const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (deleteError) throw deleteError;

    return {
        success: true,
        message: `Deleted product ${product.name}`,
        data: { id: productId }
    };
}

async function createProduct(pharmacyId, args) {
    if (!args.name || !args.price) throw new Error("Name and Price are required.");

    const { data: newProduct, error } = await supabase
        .from('products')
        .insert(args)
        .select()
        .single();

    if (error) throw error;

    return {
        success: true,
        message: `Created product ${args.name}`,
        data: newProduct
    };
}


// --- Main Route ---

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, args } = body;

        if (!args || Object.keys(args).length === 0) {
            return NextResponse.json(
                { success: false, message: "Missing args for action" },
                { status: 400 }
            );
        }

        const user = await verifyToken(req.headers);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        let result;

        switch (action) {
            case "update_product":
                result = await updateProduct(user.pharmacyId, args);
                break;
            case "delete_product":
                result = await deleteProduct(user.pharmacyId, args);
                break;
            case "create_product":
                result = await createProduct(user.pharmacyId, args);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("Action API Error:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Server error executing action"
        }, { status: 500 });
    }
}
