import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { logActivity } from "@/app/lib/logActivity";

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: allSettings, error } = await supabase
        .from('settings')
        .select('*');

    if (error) throw error;

    const settingsObj = (allSettings || []).reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ success: true, settings: settingsObj });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Key is required and must be a string" },
        { status: 400 }
      );
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { success: false, message: "Value is required" },
        { status: 400 }
      );
    }

    const { data: updatedSetting, error: upError } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' })
        .select()
        .single();

    if (upError) throw upError;

    // Log activity
    await logActivity(null, {
      action: 'settings_update',
      userId: user.userId,
      username: user.username,
      description: `تحديث إعداد "${key}" إلى "${value}"`,
      metadata: {
        key,
        newValue: value
      }
    });

    return NextResponse.json({
      success: true,
      message: "Setting saved successfully",
      setting: { key: updatedSetting.key, value: updatedSetting.value }
    });

  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
