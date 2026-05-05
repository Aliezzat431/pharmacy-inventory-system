import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/app/lib/supabase';
import { logActivity } from '@/app/lib/logActivity';

export async function POST(request) {
  try {
    const { username, password, pharmacyId } = await request.json();

    // ====== validation ======
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم غير صالح" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "كلمة المرور غير صالحة" },
        { status: 400 }
      );
    }

    // ====== Supabase Find User ======
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Note: In production use bcrypt
      .eq('active', true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET غير موجود في المتغيرات" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        username: user.username,
        userId: user.id.toString(),
        pharmacyId: pharmacyId || "1",
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          username: user.username,
          role: user.role,
          userId: user.id
        }
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // ====== Session Management ======
    
    // 1. Close any existing active sessions for this user
    await supabase
      .from('sessions')
      .update({ status: 'closed', end_time: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // 2. Determine Shift Type
    const currentHour = new Date().getHours();
    const isMorning = currentHour >= 6 && currentHour < 18;
    const shiftType = isMorning ? 'morning' : 'night';

    // 3. Create new active session
    await supabase.from('sessions').insert({
      user_id: user.id,
      username: user.username,
      start_time: new Date().toISOString(),
      shift_type: shiftType,
      status: 'active',
      device_info: request.headers.get('user-agent') || 'unknown',
      pharmacy_id: pharmacyId || "1"
    });

    // Log activity
    await logActivity(null, {
      action: 'login',
      userId: user.id,
      username: user.username,
      description: `تسجيل دخول المستخدم ${user.username} (${shiftType === 'morning' ? 'صباحي' : 'مسائي'})`,
      metadata: { role: user.role, shiftType }
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
