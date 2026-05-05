import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    try {
        const { pin } = await request.json();
        const envMasterPin = process.env.MASTER_PIN;

        if (!pin) {
            return NextResponse.json(
                { success: false, message: "الرجاء إدخال الرمز السري" },
                { status: 400 }
            );
        }

        if (!envMasterPin) {
            console.error("MASTER_PIN is not defined in environment variables");
            return NextResponse.json(
                { success: false, message: "خطأ في إعدادات النظام (MASTER_PIN مفقود)" },
                { status: 500 }
            );
        }

        if (pin !== envMasterPin) {
            return NextResponse.json(
                { success: false, message: "الرمز السري غير صحيح" },
                { status: 401 }
            );
        }

        // Generate a temporary token with master role
        // This token allows access to protected routes like /api/sales/history
        const token = jwt.sign(
            {
                role: 'master',
                pharmacyId: '1', // Default pharmacy context for master actions
                isTempMaster: true // Flag to indicate this is a PIN-based session
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Short-lived token
        );

        return NextResponse.json({
            success: true,
            token,
            message: "تم التحقق بنجاح"
        });

    } catch (error) {
        console.error("PIN Verification Error:", error);
        return NextResponse.json(
            { success: false, message: "حدث خطأ أثناء التحقق" },
            { status: 500 }
        );
    }
}
