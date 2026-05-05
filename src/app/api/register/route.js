import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import jwt from 'jsonwebtoken';
import { logActivity } from '@/app/lib/logActivity';

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Body فاضي' },
        { status: 400 }
      );
    }

    const { username, password, pharmacyId, masterPin } = body;

    const adminKey = process.env.ADMIN_KEY;
    const jwtSecret = process.env.JWT_SECRET;
    const envMasterPin = process.env.MASTER_PIN;

    // ✅ Validations
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم لازم يكون نص لا يقل عن 3 أحرف' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور لازم تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    if (!adminKey && !envMasterPin) {
      return NextResponse.json(
        { success: false, message: 'ADMIN_KEY أو MASTER_PIN غير موجود' },
        { status: 500 }
      );
    }

    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: 'JWT_SECRET غير موجود' },
        { status: 500 }
      );
    }

    // 🧠 Role logic
    let role = 'employee';

    if (masterPin) {
      if (masterPin === envMasterPin) {
        role = 'master';
      } else {
        return NextResponse.json(
          { success: false, message: 'Master PIN غير صحيح' },
          { status: 403 }
        );
      }
    } else {
      if (!password.includes(adminKey)) {
        return NextResponse.json(
          { success: false, message: 'كلمة المرور لازم تحتوي على Admin Key' },
          { status: 400 }
        );
      }
    }

    // 🔌 Check Existing User
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم موجود بالفعل' },
        { status: 409 }
      );
    }

    if (role === 'master') {
      const { data: masterExists } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'master')
        .limit(1);

      if (masterExists && masterExists.length > 0) {
        return NextResponse.json(
          { success: false, message: 'يوجد مستخدم ماستر بالفعل' },
          { status: 403 }
        );
      }
    }

    // 🧾 Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        username: username.trim(),
        password,
        pharmacy_id: pharmacyId || '1',
        role,
        active: true,
        base_salary: 0
      })
      .select()
      .single();

    if (createError) throw createError;

    // 🔐 JWT
    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        pharmacyId: newUser.pharmacy_id,
        role: newUser.role,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      { success: true, message: 'تم التسجيل بنجاح', token },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Log activity
    await logActivity(null, {
      action: 'register',
      userId: newUser.id,
      username: newUser.username,
      description: `تسجيل مستخدم جديد: ${newUser.username} (${role === 'master' ? 'مدير' : 'موظف'})`,
      metadata: {
        role: newUser.role,
        pharmacy_id: newUser.pharmacy_id
      }
    });

    return response;

  } catch (error) {
    console.error('REGISTER API ERROR:', error);
    return NextResponse.json(
      { success: false, message: 'خطأ في الخادم: ' + error.message },
      { status: 500 }
    );
  }
}
