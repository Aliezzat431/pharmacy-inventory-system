import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false }, { status: 401 });

        const isMaster = user.role === 'master';

        let query = supabase
            .from('users')
            .select(isMaster ? '*' : 'id, username, role, active, base_salary, pharmacy_id, created_at')
            .eq('active', true)
            .order('username', { ascending: true });
        
        const { data: employees, error } = await query;

        if (error) throw error;

        // Map username to name for frontend compatibility
        const mappedEmployees = employees.map(e => ({
            ...e,
            _id: e.id,
            name: e.username,
            role: e.role === 'master' ? 'مدير (Master)' : 'موظف',
            baseSalary: e.base_salary,
            password: e.password // Will be undefined for non-masters because it wasn't selected
        }));

        return NextResponse.json({ success: true, employees: mappedEmployees });
    } catch (error) {
        console.error("Employees GET Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user || user.role !== 'master') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { userId, baseSalary } = await req.json();

        if (!userId || isNaN(baseSalary) || baseSalary < 0) {
            return NextResponse.json({ success: false, message: "بيانات غير صالحة" }, { status: 400 });
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ base_salary: Number(baseSalary) })
            .eq('id', userId)
            .select()
            .single();

        if (updateError || !updatedUser) {
            return NextResponse.json({ success: false, message: "المستخدم غير موجود أو فشل التحديث" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "تم تحديث المرتب بنجاح",
            salary: updatedUser.base_salary
        });

    } catch (error) {
        console.error("Employees PATCH Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    return NextResponse.json({
        success: false,
        message: "إضافة الموظفين تتم الآن عبر صفحة التسجيل فقط لضمان أمان الحسابات"
    }, { status: 405 });
}
