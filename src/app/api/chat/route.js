import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';

// 📜 Get History
export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Fetch last 50 messages
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        // .eq('pharmacy_id', user.pharmacyId) // Filter if needed
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      messages: (messages || []).reverse().map(m => ({ ...m, _id: m.id, createdAt: m.created_at }))
    });
  } catch (err) {
    console.error("Chat History Error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// 💾 Save Message
export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { content, sender } = await req.json();
    if (!content) {
      return NextResponse.json({ success: false, message: "Content is required" }, { status: 400 });
    }

    const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
            sender: sender || user.username,
            content,
        })
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: { ...newMessage, _id: newMessage.id, createdAt: newMessage.created_at } });
  } catch (err) {
    console.error("Chat Save Error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// 🗑 Delete Message / Clear History
export async function DELETE(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
        // delete single message
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: "Message deleted"
        });
    }

    // delete all chat history
    // Caution: In production you might want to filter by user or pharmacy
    const { error } = await supabase
        .from('messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // hack to delete all if no filter

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Chat history cleared"
    });

  } catch (err) {
    console.error("Chat Delete Error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}