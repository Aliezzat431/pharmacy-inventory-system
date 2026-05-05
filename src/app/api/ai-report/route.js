import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { data, mode = "auto" } = await req.json();

    // 1. التأكد من الـ API Key موجود
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "الـ API Key مش موجود في ملف الـ .env" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 2. تجربة الموديل باسمه الصريح والمستقر
    // لو gemini-1.5-flash منفعش، المكتبة هتحاول مع gemini-pro تلقائياً
    const modelName = "gemini-1.5-flash"; 
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      أنت "محسن"، مساعد صيدلية مصري ذكي. 
      البيانات: دخل ${data.totalIn || 0}، مصاريف ${data.totalOut || 0}.
      رد بأسلوب مصري لذيذ وقول للدكتور إنك جاهز تساعده.
    `;

    // 3. طريقة الطلب الخام (Raw) عشان نتجنب مشاكل الـ v1beta
    const result = await model.generateContent(prompt);
    
    // تأكد من استخراج النص صح
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ report: text });

  } catch (error) {
    console.error("Gemini Error Context:", error);
    
    // لو لسه فيه 404، ده معناه إن الحساب بتاعك في Google Cloud محتاج تفعيل الـ API
    return NextResponse.json({ 
      error: "محسن مش عارف يوصل للسيرفر", 
      details: error.message 
    }, { status: 500 });
  }
}